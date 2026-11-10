import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { backendHarness } from './helpers/backend-harness.mjs';
import { GameStore } from '../server/store.mjs';
import { createApplication } from '../server/app.mjs';

// Public test fixtures only. Never use these passwords for a real account.
const password = 'fixture-only passphrase 123';
const register = (c, username = 'player_one') => c.call('POST','/api/auth/register',{username,password});
const login = (c, username = 'player_one', value = password) => c.call('POST','/api/auth/login',{username,password:value});

test('registration uses salted scrypt and canonical usernames without blocking game requests', async () => {
  const h=backendHarness(),a=h.client(),b=h.client();
  try {
    const pending=a.call('POST','/api/auth/register',{username:'Player_One',password},{origin:'https://field.example.test'});
    assert.equal(h.handle({path:'/api/health'}).status,200);
    const registered=await pending;
    assert.equal(registered.status,201);assert.equal(registered.data.account.username,'player_one');
    assert.equal(registered.data.activeRoom,null);assert.equal('rooms' in registered.data,false);
    assert.match(registered.headers['Set-Cookie'][0],/HttpOnly; SameSite=Strict/);
    assert.match(registered.headers['Set-Cookie'][0],/; Secure/);
    assert.equal((await register(b,'PLAYER_ONE')).status,409);
    assert.equal((await register(b,'player_two')).status,201);
    const rows=h.store.db.prepare('SELECT password_hash FROM accounts').all();
    assert.notEqual(rows[0].password_hash,rows[1].password_hash);
    assert.ok(rows.every(r=>r.password_hash.startsWith('scrypt$131072$8$1$')));
    assert.equal(/password_hash|token_hash|fixture-only/.test(JSON.stringify(registered.data)),false);
    assert.equal(a.call('GET','/api/state').status,409);
    assert.equal(a.call('POST','/api/rooms/join',{}).data.error.code,'ROOM_NOT_FOUND');
  } finally { h.store.close(); }
});

test('login has generic failure, logout revokes one device, expiry cannot fall back to a guest cookie', async () => {
  const h=backendHarness(),a=h.client(),b=h.client(),guest=h.client();
  try {
    await register(a);const oldCookie=a.cookie;
    const wrong=await login(b,'player_one','incorrect fixture password');
    const unknown=await login(b,'missing_user');
    assert.equal(wrong.status,401);assert.deepEqual(wrong.data,unknown.data);
    assert.equal((await login(b,'PLAYER_ONE')).status,200);
    assert.notEqual(a.cookie,b.cookie);
    assert.equal(a.call('POST','/api/auth/logout',{}).status,200);
    assert.equal(h.handle({path:'/api/auth/session',headers:{cookie:oldCookie}}).status,401);
    assert.equal(b.call('GET','/api/auth/session').status,200);
    h.advance(86400001);
    guest.create();b.cookie += `; ${guest.cookie}`;
    assert.equal(b.call('GET','/api/state').status,401);
    assert.equal((await login(b)).status,200,'expired cookie must not prevent signing in again');
  } finally {h.store.close();}
});

test('joining by code restores account identity and receipts across devices with separate location gates', async () => {
  const h=backendHarness(),a=h.client(),b=h.client();
  try {
    await register(a);a.createOutdoor('ignored nickname');
    const code=a.data.room.code,id=a.data.player.id;
    a.fix();a.place();a.returnToTreasure();assert.equal(a.data.state.eligible,true);
    const signedIn = await login(b);
    assert.equal(signedIn.data.activeRoom,null);
    assert.equal('rooms' in signedIn.data,false);
    assert.equal(b.call('GET','/api/state').status,409);
    assert.equal(b.join(code,'Other nickname').status,201);
    assert.equal(b.data.player.id,id);assert.equal(b.data.player.role,'owner');
    assert.equal(b.data.state.eligible,false);assert.equal(b.collect().status,409);
    assert.equal(b.join(code,'Other nickname').status,201);
    assert.equal(b.data.player.id,id);assert.equal(b.data.players.length,1);
    a.aimAtTreasure();const first=a.collect();assert.equal(first.status,200);
    const duplicate=b.collect();assert.equal(duplicate.data.collection.id,first.data.collection.id);
    assert.equal(duplicate.data.collection.repeated,true);
    assert.equal(b.create().data.error.code,'ROOM_ALREADY_JOINED');
    b.join(code);assert.equal(b.data.receipt.id,first.data.collection.id);
    assert.equal(b.data.player.id,id);assert.equal(b.data.players.length,1);
    assert.equal(h.store.db.prepare('SELECT count(*) AS n FROM claims').get().n,1);
    assert.equal(b.call('POST','/api/location/stop',{roomCode:'OLDROOM1'}).status,409);
  } finally {h.store.close();}
});

test('leaving as an account member ends one device at a time and keeps the receipt for manual rejoin', async () => {
  const h = backendHarness(), owner = h.client(), member = h.client(), secondDevice = h.client();
  try {
    owner.createOutdoor();
    await register(member);
    await login(secondDevice);
    const { code } = owner.data.room;
    member.join(code);
    secondDevice.join(code);
    owner.fix(); owner.place();
    member.call('GET', '/api/state');
    member.returnToTreasure(); member.aimAtTreasure();
    assert.equal(member.collect().status, 200);
    const { id } = member.data.player;
    const { receipt } = member.data;
    const target = { roomCode: code, treasureId: owner.data.room.treasureId };

    const left = member.call('POST', '/api/rooms/leave', target);
    assert.equal(left.data.account.username, 'player_one');
    assert.equal(left.data.activeRoom, null);
    assert.equal(member.call('GET', '/api/state').data.error.code, 'ROOM_REQUIRED');
    assert.equal(owner.call('GET', '/api/state').data.room.playerCount, 2);
    assert.deepEqual(secondDevice.call('GET', '/api/state').data.receipt, receipt);
    assert.equal(secondDevice.call('POST', '/api/rooms/leave', target).status, 200);
    assert.equal(owner.call('GET', '/api/state').data.room.playerCount, 1);
    assert.equal(member.join(code).data.player.id, id);
    assert.deepEqual(member.data.receipt, receipt);
  } finally { h.store.close(); }
});

test('legacy database migration and guest registration preserve owners and collected receipts through restart', async () => {
  const dir=mkdtempSync(join(tmpdir(),'cq-account-migration-')),path=join(dir,'old.sqlite');
  let h,restored;
  try {
    const db=new DatabaseSync(path),token='G'.repeat(43),csrf='C'.repeat(43);
    const tokenHash=createHash('sha256').update(token).digest('hex');
    db.exec(`CREATE TABLE rooms(code TEXT PRIMARY KEY,owner_id TEXT NOT NULL,treasure_id TEXT,zone TEXT,created_at INTEGER NOT NULL);
      CREATE TABLE players(id TEXT PRIMARY KEY,room TEXT NOT NULL REFERENCES rooms(code),name TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,csrf TEXT NOT NULL,expires_at INTEGER NOT NULL,last_seen INTEGER NOT NULL);
      CREATE TABLE claims(id TEXT PRIMARY KEY,room TEXT NOT NULL REFERENCES rooms(code),treasure_id TEXT NOT NULL,
        player_id TEXT NOT NULL REFERENCES players(id),created_at INTEGER NOT NULL,UNIQUE(room,treasure_id,player_id));
      INSERT INTO rooms VALUES('ROOM2222','old-player','round-one',NULL,1800000000000);`);
    db.prepare('INSERT INTO players VALUES(?,?,?,?,?,?,?)').run('old-player','ROOM2222','Old guest',tokenHash,csrf,1800086400000,1800000000000);
    db.exec("INSERT INTO claims VALUES('old-receipt','ROOM2222','round-one','old-player',1800000000000)");
    db.close();
    h=backendHarness(path);const a=h.client();a.cookie=`cq_session=${token}`;
    assert.equal(h.client().join('room-2222').status,201);
    assert.equal(a.call('GET','/api/state').status,200);
    assert.equal((await register(a)).status,201);
    a.call('GET','/api/state');assert.equal(a.data.player.id,'old-player');
    assert.equal(a.data.player.role,'owner');assert.equal(a.data.receipt.id,'old-receipt');
    assert.equal(a.call('GET','/api/progress').data.self.treasuresFound,0);
    assert.equal(a.join('room-2222').data.player.id,'old-player');
    assert.equal(h.handle({path:'/api/state',headers:{cookie:`cq_session=${token}`}}).status,401);
    h.store.close();h=null;
    restored=new GameStore(path,()=>1800000000000);
    const handle=createApplication({store:restored});
    const auth=JSON.parse(handle({path:'/api/auth/session',headers:{cookie:a.cookie}}).body);
    assert.equal(auth.account.username,'player_one');
    const state=JSON.parse(handle({path:'/api/state',headers:{cookie:a.cookie}}).body);
    assert.equal(state.receipt.id,'old-receipt');assert.equal(state.report.location.running,false);
    assert.equal(state.room.mode, 'gps');
    assert.equal(state.player.id,'old-player');
  } finally {h?.store.close();restored?.close();rmSync(dir,{recursive:true,force:true});}
});

test('account treasures rank by claims and keep unique cards through room disbanding and restart', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cq-progress-'));
  const path = join(dir, 'progress.sqlite');
  let h, restored;
  try {
    h = backendHarness(path);
    const host = h.client(), member = h.client(), guest = h.client();
    assert.equal((await register(host, 'host_account')).status, 201);
    assert.equal((await register(member, 'member_account')).status, 201);
    const progress = client => {
      const response = client.call('GET', '/api/progress');
      assert.equal(response.status, 200);
      return response.data;
    };
    const empty = progress(host);
    const totalCards = empty.cards.length;
    assert.equal(totalCards, 6);
    assert.deepEqual(empty.leaderboard, []);
    assert.equal(empty.self.rank, null);
    assert.ok(empty.cards.every(card => !card.unlocked && card.story === null));

    host.createOutdoor();
    const { code } = host.data.room;
    assert.equal(host.data.room.cardId, null);
    member.join(code);
    guest.join(code);
    assert.equal(guest.call('GET', '/api/progress').data.error.code, 'ACCOUNT_REQUIRED');
    host.fix(); host.place();
    const firstCard = host.data.room.cardId;
    const names = new Map(empty.cards.map(card => [card.id, card.name]));
    assert.ok(names.has(firstCard));
    const aim = client => {
      client.call('GET', '/api/state');
      client.returnToTreasure(); client.aimAtTreasure();
    };
    aim(guest);
    assert.equal(guest.collect().data.collection.reward, undefined);
    assert.equal(progress(host).self.treasuresFound, 0);
    aim(host);
    h.store.db.exec("CREATE TEMP TRIGGER fail_treasure_credit BEFORE INSERT ON account_treasures BEGIN SELECT RAISE(ABORT, 'fixture'); END");
    assert.equal(host.collect().status, 500);
    assert.equal(host.call('GET', '/api/state').data.receipt, null);
    assert.equal(progress(host).self.treasuresFound, 0);
    h.store.db.exec('DROP TRIGGER fail_treasure_credit');
    const first = host.collect().data.collection;
    assert.equal(first.reward.unlocked, true);
    assert.equal(first.reward.name, names.get(firstCard));
    assert.deepEqual(host.collect().data.collection, { id: first.id, collectedAt: first.collectedAt, repeated: true });
    aim(member);
    assert.equal(member.data.room.cardId, firstCard);
    assert.deepEqual(member.collect().data.collection.reward, first.reward);
    assert.deepEqual(progress(host).leaderboard.map(row => [row.username, row.rank, row.treasuresFound, row.cardsCollected]),
      [['host_account', 1, 1, 1], ['member_account', 1, 1, 1]]);

    // Seven independent draws from six cards always include a duplicate.
    const seen = new Set([firstCard]);
    for (let i = 1; i <= totalCards; i++) {
      h.advance(1000);
      host.fix(); assert.equal(host.place().status, 200);
      const { cardId } = host.data.room;
      assert.ok(names.has(cardId));
      aim(host);
      const claimed = host.collect();
      assert.equal(claimed.status, 200);
      assert.deepEqual(claimed.data.collection.reward, { name: names.get(cardId), unlocked: !seen.has(cardId) });
      seen.add(cardId);
    }
    const completed = progress(host);
    assert.equal(completed.self.treasuresFound, totalCards + 1);
    assert.equal(completed.self.cardsCollected, seen.size);
    assert.equal(completed.leaderboard[1].rank, 2);
    assert.ok(completed.cards.every(card => card.unlocked === seen.has(card.id) && Boolean(card.story) === card.unlocked));
    assert.equal(progress(member).cards.filter(card => card.unlocked).length, 1);
    assert.equal(host.call('POST', '/api/rooms/leave', { roomCode: code, treasureId: host.data.room.treasureId }).status, 200);
    assert.deepEqual(progress(host), completed);
    assert.equal(h.store.room(code), undefined);

    const cookie = host.cookie;
    h.store.close(); h = null;
    restored = backendHarness(path);
    const resumed = restored.client(); resumed.cookie = cookie;
    assert.deepEqual(progress(resumed), completed);
  } finally {
    h?.store.close();
    restored?.store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('account mutations enforce origin, JSON and session-specific CSRF; invalid passwords are bounded', async () => {
  const h=backendHarness(),a=h.client(),b=h.client();
  try {
    assert.equal(a.call('POST','/api/auth/register',{username:'safe_user',password},{origin:'https://evil.example'}).status,403);
    assert.equal(a.call('POST','/api/auth/login',{username:'safe_user',password},{'content-type':'text/plain'}).status,415);
    for(const value of ['',null,'x'.repeat(129)]) {
      assert.equal((await a.call('POST','/api/auth/register',{username:'safe_user',password:value})).status,400);
    }
    const casual=h.client();
    assert.equal((await casual.call('POST','/api/auth/register',{username:'casual_user',password:'1'})).status,201);
    assert.equal((await h.client().call('POST','/api/auth/login',{username:'casual_user',password:'1'})).status,200);
    a.create();
    assert.equal((await a.call('POST','/api/auth/register',{username:'safe_user',password},{'x-csrf-token':'wrong'})).status,403);
    const signed=await register(a,'safe_user');assert.equal(signed.status,201);
    await login(b,'safe_user');
    assert.equal(a.call('POST','/api/rooms',{}, {'x-csrf-token':b.csrf}).status,403);
    assert.equal(a.call('POST','/api/auth/logout',{}, {'x-csrf-token':'wrong'}).status,403);
    assert.equal(a.call('GET','/api/auth/session',undefined,{'sec-fetch-site':'cross-site'}).status,403);
    assert.equal(b.call('POST','/api/rooms',{name:'Impersonation'}).status,201);
    assert.equal(b.data.player.name,'safe_user');
  } finally {h.store.close();}
});

test('authentication throttling spans clients by username and recovers after the window', async () => {
  const h=backendHarness(),a=h.client();
  try {
    for(let i=0;i<8;i++) {
      const result=await h.client().call('POST','/api/auth/login',{username:'missing_user',password:''});
      assert.equal(result.status,400);
    }
    assert.equal((await login(a,'missing_user')).status,429);
    h.advance(900001);assert.equal((await register(a,'missing_user')).status,201);
  } finally {h.store.close();}
});

test('concurrent duplicate registration is atomic and password work is bounded', async () => {
  const h=backendHarness();
  try {
    const one=register(h.client(),'same_user'),two=register(h.client(),'SAME_USER'),three=register(h.client(),'other_user');
    assert.equal((await three).status,429);
    assert.deepEqual((await Promise.all([one,two])).map(r=>r.status).sort(),[201,409]);
    assert.equal(h.store.db.prepare('SELECT count(*) AS n FROM accounts').get().n,1);
  } finally {h.store.close();}
});

test('device cap revokes old sessions without removing account rooms', async () => {
  const h=backendHarness(),a=h.client();
  try {
    await register(a);a.create();const room=a.data.room.code,old=a.cookie;
    const account=h.store.db.prepare('SELECT id FROM accounts').get();
    for(let i=0;i<8;i++) h.store.issueAccountSession(account);
    assert.equal(h.handle({path:'/api/auth/session',headers:{cookie:old}}).status,401);
    assert.equal(h.store.db.prepare('SELECT count(*) AS n FROM account_sessions').get().n,8);
    assert.ok(h.store.room(room));
  } finally {h.store.close();}
});
