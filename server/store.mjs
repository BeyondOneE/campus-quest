import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { TreasureSession, validFix, normalizeRoomCode, DEFAULTS } from '../public/treasure-lab/model.js';
import { DEFAULT_ROOM_MODE, INDOOR_DEFAULTS, ROOM_MODES, isIndoorMode } from '../public/treasure-lab/indoor.js';
import { passwordHash, passwordMatches } from './passwords.mjs';
import { treasureCards } from './treasure-cards.mjs';

export class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new ApiError(status, code, message); };
const hash = token => createHash('sha256').update(token).digest('hex');
const secret = () => randomBytes(32).toString('base64url');
const makeCode = () => String(randomInt(10000)).padStart(4, '0');
const treasureCard = id => treasureCards.find(card => card.id === id) ?? treasureCards[0];

export class GameStore {
  constructor(path = ':memory:', now = () => Date.now()) {
    this.db = new DatabaseSync(path); this.now = now; this.gates = new Map();
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY, owner_id TEXT NOT NULL,
        treasure_id TEXT, zone TEXT, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY, room TEXT NOT NULL REFERENCES rooms(code),
        name TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, csrf TEXT NOT NULL,
        expires_at INTEGER NOT NULL, last_seen INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS claims(id TEXT PRIMARY KEY, room TEXT NOT NULL REFERENCES rooms(code),
        treasure_id TEXT NOT NULL, player_id TEXT NOT NULL REFERENCES players(id), created_at INTEGER NOT NULL,
        UNIQUE(room, treasure_id, player_id));
      CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS account_sessions(id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
        token_hash TEXT NOT NULL UNIQUE, csrf TEXT NOT NULL, expires_at INTEGER NOT NULL,
        active_player_id TEXT REFERENCES players(id), created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS account_treasures(claim_id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id), card_id TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS account_treasure_cards ON account_treasures(account_id, card_id);`);
    // Additive migration: old rooms, guest cookies, owners and receipts retain their IDs.
    const roomColumns = this.db.prepare('PRAGMA table_info(rooms)').all();
    if (!roomColumns.some(c => c.name === 'mode')) {
      this.db.exec("ALTER TABLE rooms ADD COLUMN mode TEXT NOT NULL DEFAULT 'gps'");
    }
    if (!roomColumns.some(c => c.name === 'card_id')) this.db.exec('ALTER TABLE rooms ADD COLUMN card_id TEXT');
    if (!this.db.prepare('PRAGMA table_info(players)').all().some(c => c.name === 'account_id')) {
      this.db.exec('ALTER TABLE players ADD COLUMN account_id TEXT REFERENCES accounts(id)');
    }
    this.db.exec('CREATE UNIQUE INDEX IF NOT EXISTS account_room ON players(room,account_id) WHERE account_id IS NOT NULL');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      // Retire incompatible local placements and keep receipts under their original round IDs.
      const retired = this.db.prepare("SELECT code FROM rooms WHERE mode IN ('indoor-imu', 'indoor-planar')").all();
      const reset = this.db.prepare("UPDATE rooms SET mode='gps', zone=NULL, treasure_id=? WHERE code=?");
      for (const { code } of retired) reset.run(randomUUID(), code);
      // Apply the test range to pre-existing points once, preserving IDs and receipts.
      for(const room of this.db.prepare('SELECT code,zone FROM rooms WHERE zone IS NOT NULL').all()) {
        const zone=JSON.parse(room.zone);
        if(zone.rangeVersion!==2)this.db.prepare('UPDATE rooms SET zone=? WHERE code=?').run(JSON.stringify({...zone,radius:3,rangeVersion:2}),room.code);
      }
      this.db.exec('COMMIT');
    } catch(error) {this.db.exec('ROLLBACK');throw error;}
  }
  close() { this.gates.clear(); this.db.close(); }
  name(value) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 32 || /[\u0000-\u001f\u007f]/.test(value)) {
      fail(400, 'INVALID_NAME', 'Use a nickname between 1 and 32 characters.');
    }
    return value.trim();
  }
  room(code) { return this.db.prepare('SELECT * FROM rooms WHERE code=?').get(code); }
  findGuestPlayer(token) {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    return this.db.prepare('SELECT * FROM players WHERE token_hash=? AND expires_at>? AND account_id IS NULL').get(hash(token), this.now());
  }
  player(token) {
    const player = this.findGuestPlayer(token);
    if (!player) fail(401, 'SESSION_REQUIRED', 'Your room session ended. Create or join a room to play again.');
    this.db.prepare('UPDATE players SET last_seen=? WHERE id=?').run(this.now(), player.id);
    return player;
  }
  addPlayer(id, code, name) {
    const token = secret(), csrf = secret(), now = this.now();
    this.db.prepare('INSERT INTO players(id,room,name,token_hash,csrf,expires_at,last_seen) VALUES(?,?,?,?,?,?,?)').run(id, code, name, hash(token), csrf, now + 86400000, now);
    return { token, player: this.player(token) };
  }
  username(value) {
    if (typeof value !== 'string' || !/^[a-zA-Z0-9_]{3,32}$/.test(value)) {
      fail(400, 'INVALID_USERNAME', 'Use 3–32 letters, numbers or underscores for your username.');
    }
    return value.toLowerCase();
  }
  password(value) {
    if (typeof value !== 'string' || !value || [...value].length > 128) {
      fail(400, 'INVALID_PASSWORD', 'Enter a password of up to 128 characters.');
    }
    return value; // Preserve spaces and Unicode exactly; never trim or truncate passwords.
  }
  accountContext(token) {
    if (!token) return null;
    const session = /^[A-Za-z0-9_-]{43}$/.test(token) && this.db.prepare(`SELECT s.*,a.username FROM account_sessions s
      JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?`).get(hash(token), this.now());
    if (!session) fail(401, 'ACCOUNT_SESSION_EXPIRED', 'Your sign-in expired. Sign in again.');
    return session;
  }
  accountView(session) {
    return { account: { id: session.account_id, username: session.username }, csrfToken: session.csrf,
      activeRoom: this.findAccountPlayer(session)?.room ?? null };
  }
  progress(session) {
    const ranked = this.db.prepare(`
      SELECT a.username, COUNT(*) AS treasuresFound, COUNT(DISTINCT t.card_id) AS cardsCollected,
        RANK() OVER (ORDER BY COUNT(*) DESC) AS rank
      FROM account_treasures t JOIN accounts a ON a.id=t.account_id
      GROUP BY a.id, a.username ORDER BY rank, a.username`).all();
    const self = ranked.find(row => row.username === session.username)
      ?? { username: session.username, treasuresFound: 0, cardsCollected: 0, rank: null };
    const unlocked = new Set(this.db.prepare('SELECT DISTINCT card_id FROM account_treasures WHERE account_id=?')
      .all(session.account_id).map(row => row.card_id));
    const cards = treasureCards.map(({ id, name, story }) => ({
      id, name, unlocked: unlocked.has(id), story: unlocked.has(id) ? story : null,
    }));
    return { leaderboard: ranked.slice(0, 10), self, cards };
  }
  issueAccountSession(account, activePlayerId = null) {
    const token = secret(), id = randomUUID(), now = this.now();
    this.db.prepare('INSERT INTO account_sessions VALUES(?,?,?,?,?,?,?)')
      .run(id, account.id, hash(token), secret(), now + 86400000, activePlayerId, now);
    // A test account may use up to eight devices. Revoked devices must authenticate again.
    const old = this.db.prepare('SELECT * FROM account_sessions WHERE account_id=? ORDER BY created_at DESC,rowid DESC LIMIT -1 OFFSET 8').all(account.id);
    for (const session of old) this.logout(session);
    return { token, session: this.accountContext(token) };
  }
  async register(body, guest = null) {
    const username = this.username(body.username), password = this.password(body.password);
    if (this.db.prepare('SELECT count(*) AS n FROM accounts').get().n >= 1000) fail(429, 'ACCOUNT_LIMIT', 'This test server has reached its account limit.');
    const encoded = await passwordHash(password);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (this.db.prepare('SELECT id FROM accounts WHERE username=?').get(username)) fail(409, 'USERNAME_TAKEN', 'That username is unavailable.');
      const account = { id: randomUUID() };
      this.db.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run(account.id, username, encoded, this.now());
      let active = null;
      if (guest) {
        const adopted = this.db.prepare('UPDATE players SET account_id=?,name=? WHERE id=? AND account_id IS NULL AND expires_at>?')
          .run(account.id, username, guest.id, this.now());
        if (adopted.changes) { active = guest.id; this.gates.delete(guest.id); }
      }
      const result = this.issueAccountSession(account, active);
      this.db.exec('COMMIT'); return result;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  async login(body) {
    const username = this.username(body.username), password = this.password(body.password);
    const account = this.db.prepare('SELECT * FROM accounts WHERE username=?').get(username);
    if (!await passwordMatches(password, account?.password_hash)) fail(401, 'INVALID_CREDENTIALS', 'Username or password is incorrect.');
    return this.issueAccountSession(account);
  }
  logout(session) {
    if (session.active_player_id) this.gates.delete(`${session.active_player_id}:${session.id}`);
    this.db.prepare('DELETE FROM account_sessions WHERE id=?').run(session.id);
  }
  findAccountPlayer(session) {
    if (!session.active_player_id) return null;
    const player = this.db.prepare('SELECT * FROM players WHERE id=? AND account_id=?').get(session.active_player_id, session.account_id);
    return player ? { ...player, csrf: session.csrf, gateKey: `${player.id}:${session.id}` } : null;
  }
  accountPlayer(session) {
    const player = this.findAccountPlayer(session);
    if (!player) fail(409, 'ROOM_REQUIRED', 'Create or join a room to start playing.');
    this.db.prepare('UPDATE players SET last_seen=?,expires_at=? WHERE id=?').run(this.now(), this.now() + 86400000, player.id);
    return player;
  }
  accountRoom(session, code = null) {
    let player;
    if (code !== null) {
      code = normalizeRoomCode(code);
      if (!code || !this.room(code)) fail(404, 'ROOM_NOT_FOUND', 'Room not found. Check the code.');
      player = this.db.prepare('SELECT * FROM players WHERE room=? AND account_id=?').get(code, session.account_id);
    }
    if (!player) {
      const result = code === null ? this.create(session.username) : this.join(code, session.username);
      player = result.player;
      this.db.prepare('UPDATE players SET account_id=? WHERE id=?').run(session.account_id, player.id);
    } else if (player.expires_at <= this.now()) this.requireRoomSlot(code);
    if (session.active_player_id) this.gates.delete(`${session.active_player_id}:${session.id}`);
    this.db.prepare('UPDATE account_sessions SET active_player_id=? WHERE id=?').run(player.id, session.id);
    session.active_player_id = player.id;
    return this.accountPlayer(session);
  }
  create(name) {
    name = this.name(name);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (this.db.prepare('SELECT count(*) AS n FROM rooms').get().n >= 500) fail(429, 'ROOM_LIMIT', 'This test server has reached its session limit.');
      let code;
      do { code = makeCode(); } while (this.room(code));
      const id = randomUUID();
      this.db.prepare('INSERT INTO rooms(code,owner_id,treasure_id,zone,created_at,mode) VALUES(?,?,?,NULL,?,?)')
        .run(code, id, randomUUID(), this.now(), DEFAULT_ROOM_MODE);
      const result = this.addPlayer(id, code, name); this.db.exec('COMMIT'); return result;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  join(code, name) {
    name = this.name(name);
    code = normalizeRoomCode(code);
    if (!code || !this.room(code)) fail(404, 'ROOM_NOT_FOUND', 'Room not found. Check the code.');
    this.requireRoomSlot(code);
    return this.addPlayer(randomUUID(), code, name);
  }
  requireRoomSlot(code) {
    if (this.db.prepare('SELECT count(*) AS n FROM players WHERE room=? AND expires_at>?').get(code, this.now()).n >= 16) {
      fail(409, 'ROOM_FULL', 'This test session is full.');
    }
  }
  claim(player, room) {
    return room.treasure_id ? this.db.prepare('SELECT id,created_at FROM claims WHERE room=? AND treasure_id=? AND player_id=?')
      .get(room.code, room.treasure_id, player.id) : null;
  }
  gate(player, room = this.room(player.room)) {
    const key = player.gateKey || player.id;
    let item = this.gates.get(key);
    if (!item || item.version !== room.treasure_id) {
      const model = new TreasureSession({mode:room.mode});
      model.zone = room.zone ? JSON.parse(room.zone) : null;
      model.phase = model.zone ? 'leave' : 'unplaced';
      if (this.claim(player, room)) { model.phase = 'collected'; model.collectionCount = 1; }
      item = { room:room.code, version: room.treasure_id, model, lastSeen: this.now() }; this.gates.set(key, item);
    }
    item.lastSeen = this.now();
    return item.model;
  }
  expected(room, treasureId) {
    if (treasureId !== room.treasure_id) fail(409, 'TREASURE_CHANGED', 'The treasure changed. Refresh the test session.');
  }
  clearRoomGates(code) {
    for (const [key, item] of this.gates) if (item.room === code) this.gates.delete(key);
  }
  leaveRoom(player, treasureId, { sessionId = null, resetDemo = false, signOut = false } = {}) {
    const code = player.room;
    let closed;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const room = this.room(code);
      if (!room) fail(409, 'ROOM_REQUIRED', 'Create or join a room to start playing.');
      closed = player.id === room.owner_id;
      if (resetDemo && !closed) fail(403, 'OWNER_REQUIRED', 'Only the host can reset the demo room.');
      this.expected(room, treasureId);
      if (closed) {
        this.db.prepare('UPDATE account_sessions SET active_player_id=NULL WHERE active_player_id IN (SELECT id FROM players WHERE room=?)').run(code);
        this.db.prepare('DELETE FROM claims WHERE room=?').run(code);
        this.db.prepare('DELETE FROM players WHERE room=?').run(code);
        this.db.prepare('DELETE FROM rooms WHERE code=?').run(code);
      } else {
        if (sessionId) this.db.prepare('UPDATE account_sessions SET active_player_id=NULL WHERE id=?').run(sessionId);
        const now = this.now();
        // Keep receipts tied to the player while removing their presence after the last device leaves.
        this.db.prepare(`UPDATE players SET expires_at=? WHERE id=? AND NOT EXISTS
          (SELECT 1 FROM account_sessions WHERE active_player_id=? AND expires_at>?)`).run(now, player.id, player.id, now);
      }
      if (signOut) this.db.prepare('DELETE FROM account_sessions WHERE id=?').run(sessionId);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    if (closed) this.clearRoomGates(code);
    else this.gates.delete(player.gateKey || player.id);
    return closed;
  }
  location(player, body) {
    const room = this.room(player.room); this.expected(room, body.treasureId);
    if(room.mode!=='gps')fail(409,'MODE_CHANGED','This room uses indoor motion, not GPS.');
    const { fix } = body, now = this.now();
    if (!validFix(fix) || fix.timestamp > now + 5000 || now - fix.timestamp > DEFAULTS.maxAge) {
      fail(400, 'INVALID_FIX', 'Send a fresh valid location reading.');
    }
    const gate = this.gate(player, room);
    if (!gate.tracking) gate.start(now);
    return gate.receive(fix, now);
  }
  setMode(player,body){
    const room=this.room(player.room);this.expected(room,body.treasureId);
    if(player.id!==room.owner_id)fail(403,'OWNER_REQUIRED','Only the host can change the room mode.');
    if (!ROOM_MODES.includes(body.mode)) fail(400, 'INVALID_MODE', 'Choose a listed game mode.');
    if(body.mode===room.mode)return;
    this.db.exec('BEGIN IMMEDIATE');
    try{
      if(room.treasure_id)this.db.prepare('DELETE FROM claims WHERE room=? AND treasure_id=?').run(room.code,room.treasure_id);
      this.db.prepare('UPDATE rooms SET mode=?,zone=NULL,treasure_id=?,card_id=NULL WHERE code=?').run(body.mode,randomUUID(),room.code);
      this.db.exec('COMMIT');
    }catch(error){this.db.exec('ROLLBACK');throw error;}
    // Invalidate only this room's caches, including signed-in per-device gates.
    this.clearRoomGates(room.code);
  }
  indoor(player,body){
    const room=this.room(player.room);this.expected(room,body.treasureId);
    if (!isIndoorMode(room.mode)) fail(409, 'MODE_CHANGED', 'This room uses GPS.');
    if (player.id !== room.owner_id) fail(403, 'OWNER_REQUIRED', 'RoNIN uses the host phone.');
    const gate=this.gate(player,room);if(!gate.tracking)gate.start(this.now());
    return gate.receiveIndoor(body.fix,this.now());
  }
  stop(player, body = {}) { const gate=this.gate(player); body.transient === true ? gate.loseLocation(this.now()) : gate.stop(this.now()); }
  aim(player, body) {
    const room = this.room(player.room); this.expected(room, body.treasureId);
    if (body.cancelEncounter === true) return this.gate(player,room).cancelEncounter(this.now(),body.encounterId);
    return this.gate(player, room).aim(body.sample, this.now());
  }
  place(player, body) {
    const room = this.room(player.room); this.expected(room, body.treasureId);
    if (room.owner_id !== player.id) fail(403, 'OWNER_REQUIRED', 'Only the session creator can place the shared treasure.');
    const current = this.gate(player, room), now = this.now();
    if (!current.place(body.radius, now)) fail(409, 'LOCATION_REQUIRED', isIndoorMode(room.mode)
      ? 'Enable motion and hold the phone steady until it is ready.' : 'Wait for a fresh accurate position and use a radius between 3 and 100 m.');
    const treasureId = randomUUID();
    const card = treasureCards[randomInt(treasureCards.length)];
    this.db.prepare('UPDATE rooms SET treasure_id=?,zone=?,card_id=? WHERE code=?')
      .run(treasureId, JSON.stringify(current.zone), card.id, room.code);
    for (const p of this.db.prepare('SELECT id FROM players WHERE room=?').all(room.code)) this.gates.delete(p.id);
    // Keep the placing player's valid fix; every player still needs to leave and return.
    const next = this.gate(player); next.fix = current.fix; next.tracking = current.tracking;
    next.lastTimestamp = current.lastTimestamp; next.samples = current.samples;
    next.indoorFix=current.indoorFix;
    next.log('shared-treasure-placed', now);
  }
  collect(player, body) {
    let gate, result;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const room = this.room(player.room);
      if (!room) fail(409, 'ROOM_REQUIRED', 'Create or join a room to start playing.');
      this.expected(room, body.treasureId);
      const existing = this.claim(player, room);
      if (existing) {
        this.db.exec('COMMIT');
        return { id: existing.id, collectedAt: existing.created_at, repeated: true };
      }
      if (body.cameraLive !== true) fail(400, 'CAMERA_REQUIRED', 'Open the live camera before collecting.');
      const collectedAt = this.now();
      gate = this.gate(player, room);
      const { eligible, canClaim } = gate.snapshot(collectedAt);
      if (!eligible) fail(409, 'NOT_ELIGIBLE', 'Enter the nearby search area to lock a new treasure encounter.');
      if (!canClaim) fail(409, 'AIM_REQUIRED', 'Point the camera at the chest and hold briefly before claiming.');
      const id = randomUUID();
      this.db.prepare('INSERT INTO claims VALUES(?,?,?,?,?)').run(id, room.code, room.treasure_id, player.id, collectedAt);
      result = { id, collectedAt, repeated: false };
      if (player.account_id) {
        const card = treasureCard(room.card_id);
        const alreadyUnlocked = this.db.prepare('SELECT 1 FROM account_treasures WHERE account_id=? AND card_id=? LIMIT 1')
          .get(player.account_id, card.id);
        this.db.prepare('INSERT INTO account_treasures(claim_id,account_id,card_id) VALUES(?,?,?)').run(id, player.account_id, card.id);
        result.reward = { name: card.name, unlocked: !alreadyUnlocked };
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    gate.collect(result.collectedAt);
    return result;
  }
  state(player) {
    const now = this.now(), room = this.room(player.room), gate = this.gate(player, room), reading = gate.snapshot(now);
    const receipt = this.claim(player, room);
    const indoor = isIndoorMode(room.mode);
    const fix = indoor ? gate.indoorFix : gate.fix;
    const maxAge = indoor ? INDOOR_DEFAULTS.maxAge : DEFAULTS.maxAge;
    const fixLifetime = fix ? Math.max(0, maxAge - (now - fix.timestamp)) : 0;
    const encounterLifetime = reading.nearField?.expiresInMs ?? fixLifetime;
    const expiresInMs = indoor ? Math.min(encounterLifetime, fixLifetime) : encounterLifetime;
    return { serverTime: now, csrfToken: player.csrf,
      room: { code: room.code, treasureId: room.treasure_id, placed: Boolean(room.zone),
        cardId: room.zone ? treasureCard(room.card_id).id : null,
        mode:room.mode,
        radius: gate.zone?.radius ?? DEFAULTS.radius, policy: 'one-claim-per-player', playerCount: this.db.prepare('SELECT count(*) AS n FROM players WHERE room=? AND expires_at>?').get(room.code, now).n },
      player: { id: player.id, name: player.name, role: player.id === room.owner_id ? 'owner' : 'guest' },
      state: { ...reading, canPlace: player.id === room.owner_id && reading.canPlace, expiresInMs },
      report: gate.report(now), receipt: receipt ? { id: receipt.id, collectedAt: receipt.created_at } : null,
      players: this.db.prepare(`SELECT p.id,p.name,EXISTS(SELECT 1 FROM claims c WHERE c.player_id=p.id AND c.treasure_id=?) AS collected
        FROM players p WHERE p.room=? AND p.expires_at>? ORDER BY p.last_seen DESC`).all(room.treasure_id, room.code, now)
        .map(p => ({ ...p, collected: Boolean(p.collected) })) };
  }
  prune() {
    this.db.prepare('DELETE FROM account_sessions WHERE expires_at<=?').run(this.now());
    const cutoff = this.now() - 1800000;
    for (const [id, item] of this.gates) if (item.lastSeen < cutoff) this.gates.delete(id);
  }
}
