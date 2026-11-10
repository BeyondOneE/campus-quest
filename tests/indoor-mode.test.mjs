import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backendHarness } from './helpers/backend-harness.mjs';
import { harness } from './helpers/treasure-harness.mjs';
import { CampusGuide } from '../server/guide.mjs';
import { RemoteTreasureSession } from '../public/treasure-lab/client.js';

const ronin = { available: true, async infer({ count }) { return Array.from({ length: count }, () => [0, 0]); } };
const local = (timestamp, extra = {}) => ({ source: 'ronin-imu', frameId: 'fixture-indoor', timestamp,
  x: 0, y: 0, heading: 0, stationary: true, ...extra });
const post = (client, path, body, headers) => client.call('POST', path, { treasureId: client.data.room.treasureId, ...body }, headers);
const select = (client, mode, headers) => post(client, '/api/mode', { mode }, headers);
const fix = (client, h, extra) => post(client, '/api/indoor', { fix: local(h.now(), extra) });

function roninRoom(h = backendHarness(':memory:', { ronin })) {
  const owner = h.client();
  assert.equal(owner.create().data.room.mode, 'indoor-ronin');
  assert.equal(fix(owner, h).data.accepted, true);
  assert.equal(owner.place().status, 200);
  return { h, owner };
}

function returnToChest(owner, h) {
  h.advance(600); fix(owner, h, { y: .9 });
  assert.equal(owner.data.state.phase, 'return');
  h.advance(600); fix(owner, h, { y: .4 });
  h.advance(1000); fix(owner, h, { y: .4 });
  assert.equal(owner.data.state.eligible, true);
}

function aimAtChest(owner, h) {
  const { guidance, nearField } = owner.data.state;
  for (let i = 0; i < 4; i++) {
    if (i) h.advance(400);
    assert.equal(post(owner, '/api/aim', { sample: { heading: guidance.bearingDegrees, pitch: guidance.pitchDegrees,
      source: 'local-gyro', frameId: 'fixture-indoor', encounterId: nearField.id,
      timestamp: h.now(), cameraLive: true, videoAgeMs: 0 } }).data.accepted, true);
  }
}

test('the host can switch only between GPS and RoNIN and a switch invalidates the current round', () => {
  const { h, owner } = roninRoom(), guest = h.client();
  try {
    guest.join(owner.data.room.code);
    assert.equal(select(guest, 'gps').status, 403);
    assert.equal(fix(guest, h).status, 403);
    assert.equal(owner.fix().status, 409);
    assert.equal(select(owner, 'gps', { 'x-csrf-token': 'bad' }).status, 403);
    const old = owner.data.room.treasureId;
    for (const mode of ['indoor-imu', 'indoor-planar']) {
      const response = select(owner, mode);
      assert.equal(response.status, 400);
      assert.equal(response.data.error.code, 'INVALID_MODE');
    }
    assert.equal(owner.data.room.treasureId, old);
    assert.equal(owner.data.room.placed, true);
    returnToChest(owner, h); aimAtChest(owner, h);
    assert.equal(owner.collect().status, 200);
    assert.equal(owner.collect().data.collection.repeated, true);
    assert.equal(select(owner, 'gps').status, 200);
    assert.equal(owner.data.room.placed, false);
    assert.equal(owner.data.receipt, null);
    assert.equal(h.store.db.prepare('SELECT count(*) AS n FROM claims').get().n, 0);
    assert.notEqual(owner.data.room.treasureId, old);
    assert.equal(guest.call('GET', '/api/state').data.room.mode, 'gps');
    assert.equal(post(owner, '/api/indoor', { fix: local(h.now()), treasureId: old }).data.error.code, 'TREASURE_CHANGED');
    assert.equal(post(owner, '/api/collect', { cameraLive: true, treasureId: old }).status, 409);
    assert.equal(fix(owner, h).data.error.code, 'MODE_CHANGED');
    owner.fix(); owner.place();
    const round = owner.data.room.treasureId;
    assert.equal(select(owner, 'gps').data.room.treasureId, round);
    assert.equal(select(owner, 'indoor-ronin').data.room.placed, false);
  } finally { h.store.close(); }
});

test('RoNIN rejects jumps and stale input and requires replacement after recalibration', () => {
  const { h, owner } = roninRoom();
  try {
    h.advance(100);
    assert.equal(fix(owner, h, { x: 5 }).data.accepted, false);
    assert.equal(fix(owner, h, { timestamp: h.now() - 2000 }).data.accepted, false);
    returnToChest(owner, h);
    h.advance(100);
    assert.equal(fix(owner, h, { frameId: 'recalibrated' }).data.accepted, true);
    assert.equal(owner.data.state.needsPlacement, true);
    assert.equal(owner.data.state.eligible, false);
    assert.equal(owner.place().data.state.phase, 'leave');
    assert.equal(owner.collect().status, 409);
  } finally { h.store.close(); }
});

test('retired rooms reopen in GPS with a fresh round and preserve identities and historical receipts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cq-room-modes-'));
  const path = join(dir, 'test.sqlite');
  let h;
  try {
    h = backendHarness(path, { ronin });
    const gps = h.client(); gps.createOutdoor(); gps.fix(); gps.place();
    const active = [h.store.room(gps.data.room.code), h.store.room(roninRoom(h).owner.data.room.code)];
    const retired = ['indoor-imu', 'indoor-planar'].map(mode => {
      const client = h.client(); client.createOutdoor(); client.fix(); client.place();
      const { code, treasureId } = client.data.room;
      h.store.db.prepare('UPDATE rooms SET mode=?, zone=? WHERE code=?')
        .run(mode, JSON.stringify({ kind: mode, x: 2, y: 3, frameId: 'old-frame', radius: 1, rangeVersion: 2 }), code);
      h.store.db.prepare('INSERT INTO claims VALUES(?,?,?,?,?)')
        .run(mode, code, treasureId, client.data.player.id, h.now());
      return { mode, code, treasureId, playerId: client.data.player.id, cookie: client.cookie };
    });
    h.store.close(); h = null;
    h = backendHarness(path, { ronin });
    for (const row of active) assert.deepEqual(h.store.room(row.code), row);
    const migrated = retired.map(old => {
      const client = h.client(); client.cookie = old.cookie;
      const state = client.call('GET', '/api/state').data;
      assert.equal(state.player.id, old.playerId);
      assert.equal(state.player.role, 'owner');
      assert.equal(state.room.code, old.code);
      assert.equal(state.room.mode, 'gps');
      assert.equal(state.room.placed, false);
      assert.equal(state.state.phase, 'unplaced');
      assert.equal(state.receipt, null);
      assert.notEqual(state.room.treasureId, old.treasureId);
      assert.equal(h.store.db.prepare('SELECT treasure_id FROM claims WHERE id=?').get(old.mode).treasure_id, old.treasureId);
      assert.equal(post(client, '/api/collect', { cameraLive: true, treasureId: old.treasureId }).data.error.code, 'TREASURE_CHANGED');
      return h.store.room(old.code);
    });
    h.store.close(); h = null;
    h = backendHarness(path, { ronin });
    for (const row of [...active, ...migrated]) assert.deepEqual(h.store.room(row.code), row);
    assert.equal(h.store.db.prepare('SELECT count(*) AS n FROM claims').get().n, 2);
  } finally {
    h?.store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the guide receives an estimated RoNIN distance with no GPS position', () => {
  const { h, owner } = roninRoom();
  try {
    returnToChest(owner, h);
    const player = h.store.db.prepare('SELECT * FROM players WHERE id=?').get(owner.data.player.id);
    const { context } = new CampusGuide().read(h.store, player);
    assert.equal(context.gps, 'not-used');
    assert.equal(context.positionMode, 'indoor-ronin');
    assert.equal(context.place, null);
    assert.match(context.distanceLabel, /RoNIN/);
    assert.doesNotMatch(JSON.stringify(context), /latitude|longitude|frameId/);
    assert.doesNotMatch(JSON.stringify(owner.data), /latitude|longitude|"x"|"y"/);
  } finally { h.store.close(); }
});

test('motion permission completing after switching to GPS cannot attach old sensors', async () => {
  let grant;
  const h = harness({ motionPermission: () => new Promise(resolve => { grant = resolve; }) });
  await h.click('mode-ronin');
  const pending = h.click('start-location');
  await h.click('mode-gps');
  grant('granted'); await pending;
  assert.equal(h.motionListening, false);
  assert.equal(h.geoRequests, 0);
  assert.equal(h.session.mode, 'gps');
});

test('Indoor distinguishes a denied grant from a request needing a direct tap', async () => {
  let requests = 0;
  const h = harness({ motionPermission: async () => {
    if (++requests === 2) throw new DOMException('Gesture required', 'NotAllowedError');
    return 'denied';
  } });
  await h.click('mode-ronin');
  await h.click('start-location');
  assert.match(h.node('alert').textContent, /Motion permission denied/);
  await h.click('start-location');
  assert.match(h.node('alert').textContent, /Tap Enable motion in Safari/);
  assert.equal(h.motionListening, false);
});

test('the remote adapter sends RoNIN inference and fixes, claims, and resets the room', async () => {
  const h = backendHarness(':memory:', { ronin }), browser = h.client(), paths = [];
  const session = new RemoteTreasureSession({ now: h.now, request: async (path, options) => {
    paths.push(path);
    const result = await browser.call(options.method, path, options.body ? JSON.parse(options.body) : undefined,
      { 'x-csrf-token': options.headers['X-CSRF-Token'] || '' });
    return { ok: result.status < 400, status: result.status, json: async () => result.data };
  } });
  try {
    assert.equal(session.mode, 'indoor-ronin');
    assert(await session.connect('Isolated remote'));
    assert.equal(session.mode, 'indoor-ronin');
    session.start(h.now());
    const batch = { count: 1, startMs: 0, frames: Array.from({ length: 51 }, (_, i) => [i * 20, 0, 0, 0, 0, 0, 9.81]) };
    assert.deepEqual(await session.inferRonin(batch, new AbortController().signal), [[0, 0]]);
    assert(await session.receiveIndoor(local(h.now())));
    assert(await session.place(3));
    h.advance(600); await session.receiveIndoor(local(h.now(), { y: .9 }));
    h.advance(600); await session.receiveIndoor(local(h.now(), { y: .4 }));
    h.advance(1000); await session.receiveIndoor(local(h.now(), { y: .4 }));
    const { guidance, nearField } = session.data.state;
    for (let i = 0; i < 4; i++) {
      if (i) h.advance(400);
      assert(await session.aim({ heading: guidance.bearingDegrees, pitch: guidance.pitchDegrees,
        timestamp: h.now(), source: 'local-gyro', frameId: 'fixture-indoor', encounterId: nearField.id,
        cameraLive: true, videoAgeMs: 0 }));
    }
    assert(await session.collect());
    assert(session.data.receipt);
    assert(paths.includes('/api/ronin') && paths.includes('/api/indoor') && !paths.includes('/api/location'));
    assert(await session.setMode('gps'));
    assert.equal(session.zone, null);
    assert.equal(session.data.receipt, null);
    assert.equal(session.active, false);
    assert.equal(session.phase, 'unplaced');
  } finally { h.store.close(); }
});
