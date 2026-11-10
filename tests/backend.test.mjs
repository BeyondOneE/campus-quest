import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backendHarness } from './helpers/backend-harness.mjs';
import { GameStore } from '../server/store.mjs';
import { createApplication } from '../server/app.mjs';
import { CampusGuide } from '../server/guide.mjs';

test('new guest and account rooms start in Indoor and joining uses the saved mode', async () => {
  const h = backendHarness(), host = h.client(), guest = h.client(), signedIn = h.client();
  try {
    const created = host.create();
    assert.equal(created.status, 201);
    assert.equal(created.data.room.mode, 'indoor-ronin');
    assert.equal(created.data.state.mode, 'indoor-ronin');
    const { code, treasureId } = created.data.room;
    assert.equal(host.call('POST', '/api/mode', { mode: 'gps', treasureId }).status, 200);
    assert.equal(guest.join(code).data.room.mode, 'gps');
    assert.equal(host.call('GET', '/api/state').data.room.mode, 'gps');

    assert.equal((await signedIn.call('POST', '/api/auth/register', { username: 'indoor_host', password: 'fixture' })).status, 201);
    const accountRoom = signedIn.create();
    assert.equal(accountRoom.status, 201);
    assert.equal(accountRoom.data.room.mode, 'indoor-ronin');
  } finally { h.store.close(); }
});

test('two independent guest sessions share one treasure while only the owner can place it', () => {
  const h = backendHarness(), owner = h.client(), guest = h.client();
  owner.createOutdoor();
  const { code } = owner.data.room;
  assert.match(code, /^\d{4}$/);
  assert.equal(owner.data.room.placed, false);
  assert.ok(owner.data.room.treasureId);
  assert.equal(guest.join(`${code.slice(0, 2)}-${code.slice(2)}`).status, 201);
  assert.notEqual(owner.data.player.id, guest.data.player.id);
  owner.fix(); assert.equal(owner.place().status, 200);
  guest.call('GET', '/api/state'); assert.equal(guest.data.room.treasureId, owner.data.room.treasureId);
  guest.fix(); assert.equal(guest.place().status, 403);
  assert.equal(guest.data.state.canPlace, false);
  const serialized = JSON.stringify(guest.data);
  assert.equal(/latitude|longitude|token_hash/.test(serialized), false);
  assert.equal(guest.data.players.length, 2); h.store.close();
});

test('server rejects early collection and gives each player exactly one durable receipt', () => {
  const h = backendHarness(), a = h.client(), b = h.client(); a.createOutdoor(); b.join(a.data.room.code);
  a.fix(); a.place(); b.call('GET','/api/state');
  assert.equal(a.collect().status, 409);
  a.returnToTreasure(); b.returnToTreasure();
  a.aimAtTreasure();
  const first = a.collect(), duplicate = a.collect();
  b.aimAtTreasure(); const other = b.collect();
  assert.equal(first.status, 200); assert.equal(duplicate.data.collection.repeated, true);
  assert.equal(first.data.collection.id, duplicate.data.collection.id); assert.equal(other.status, 200);
  assert.notEqual(other.data.collection.id, first.data.collection.id);
  assert.equal(h.store.db.prepare('SELECT count(*) AS n FROM claims').get().n, 2);
  a.call('GET','/api/state'); assert.ok(a.data.players.every(p => p.collected)); h.store.close();
});

test('imprecise, stale, invalid and out-of-order fixes cannot unlock server collection', () => {
  const h = backendHarness(), a = h.client(); a.createOutdoor();
  assert.equal(a.fix(0,100).status, 200); assert.equal(a.place().status,409);
  h.advance(1000); a.fix(); a.place();
  assert.equal(a.fix(65,5,h.now()-16000).status,400);
  assert.equal(a.fix(65,5,h.now()+6000).status,400);
  const invalid = a.call('POST','/api/location',{treasureId:a.data.room.treasureId,fix:{latitude:200,longitude:0,accuracy:0,timestamp:h.now()}});
  assert.equal(invalid.status,400);
  a.returnToTreasure(); h.advance(16000); assert.equal(a.collect().status,409); h.store.close();
});

test('stopping location invalidates eligibility; re-placement isolates delayed requests from the old round', () => {
  const h=backendHarness(),a=h.client();a.createOutdoor();a.fix();a.place();a.returnToTreasure();
  a.call('POST','/api/location/stop',{});assert.equal(a.collect().status,409);
  h.advance(1000);a.fix();const old=a.data.room.treasureId;a.place();
  assert.notEqual(a.data.room.treasureId,old);
  assert.equal(a.call('POST','/api/collect',{treasureId:old,cameraLive:true}).status,409);h.store.close();
});

test('resetting a demo requires the host and current room and deletes only that room', () => {
  const guide = new CampusGuide(), h = backendHarness(':memory:', { guide });
  const owner = h.client(), guest = h.client(), other = h.client();
  try {
    owner.createOutdoor(); guest.join(owner.data.room.code); other.createOutdoor();
    for (const client of [owner, other]) {
      client.fix(); client.place(); client.returnToTreasure(); client.aimAtTreasure();
      assert.equal(client.collect().status, 200);
      assert.equal(client.call('GET', '/api/guide').status, 200);
    }
    guest.call('GET', '/api/state');
    assert.equal(guest.call('GET', '/api/guide').status, 200);
    const { code, treasureId } = owner.data.room;
    const ownerReceipt = owner.data.receipt, otherReceipt = other.data.receipt;
    const body = { roomCode: code, treasureId };
    const reset = (client, input = body, headers) => client.call('POST', '/api/rooms/reset', input, headers);
    const oldCookie = owner.cookie;
    assert.equal(reset(guest).data.error.code, 'OWNER_REQUIRED');
    assert.equal(reset(owner, body, { 'x-csrf-token': 'wrong' }).data.error.code, 'CSRF_REQUIRED');
    assert.equal(reset(owner, body, { origin: 'https://unrelated.example' }).data.error.code, 'ORIGIN_REJECTED');
    assert.equal(reset(owner, { ...body, roomCode: other.data.room.code }).data.error.code, 'ROOM_CHANGED');
    assert.equal(reset(owner, { ...body, treasureId: 'stale' }).data.error.code, 'TREASURE_CHANGED');
    assert.ok(h.store.room(code).zone);

    h.store.db.exec("CREATE TEMP TRIGGER fail_demo_reset BEFORE DELETE ON rooms BEGIN SELECT RAISE(ABORT, 'test rollback'); END");
    assert.equal(reset(owner).status, 500);
    assert.deepEqual(owner.call('GET', '/api/state').data.receipt, ownerReceipt);
    assert.equal(guest.call('GET', '/api/state').status, 200);
    h.store.db.exec('DROP TRIGGER fail_demo_reset');

    assert.deepEqual(reset(owner).data, { account: null, activeRoom: null });
    assert.equal(owner.cookie, '');
    assert.equal(guest.call('GET', '/api/state').status, 401);
    assert.equal(guest.join(code).status, 404);
    assert.equal(h.handle({ path: '/api/state', headers: { cookie: oldCookie } }).status, 401);
    assert.equal(h.store.room(code), undefined);
    assert.equal(h.store.db.prepare('SELECT count(*) AS n FROM players WHERE room=?').get(code).n, 0);
    assert.equal(h.store.db.prepare('SELECT count(*) AS n FROM claims WHERE room=?').get(code).n, 0);
    assert.ok([...h.store.gates.values()].every(item => item.room === other.data.room.code));
    assert.equal(guide.conversations.size, 1);
    assert.deepEqual(other.call('GET', '/api/state').data.receipt, otherReceipt);
    const next = owner.create().data;
    assert.equal(next.state.phase, 'unplaced');
    assert.notEqual(next.room.treasureId, treasureId);
    assert.equal(reset(owner).status, 409);
  } finally { h.store.close(); }
});

test('a guest can leave without closing the room, and the host closes it for every participant', () => {
  const h = backendHarness(), host = h.client(), guest = h.client(), other = h.client();
  try {
    host.create(); other.create();
    const { code, treasureId } = host.data.room;
    const target = { roomCode: code, treasureId };
    guest.join(code);
    assert.equal(host.join(other.data.room.code).data.error.code, 'ROOM_ALREADY_JOINED');
    assert.equal(host.create().data.error.code, 'ROOM_ALREADY_JOINED');
    const leave = (client, body = target, headers) => client.call('POST', '/api/rooms/leave', body, headers);
    assert.equal(leave(guest).status, 200);
    assert.equal(guest.call('GET', '/api/state').status, 401);
    assert.equal(host.call('GET', '/api/state').data.room.playerCount, 1);
    assert.equal(guest.join(code).status, 201);
    assert.equal(leave(host, target, { 'x-csrf-token': 'wrong' }).data.error.code, 'CSRF_REQUIRED');
    assert.equal(leave(host, { ...target, roomCode: other.data.room.code }).data.error.code, 'ROOM_CHANGED');
    assert.equal(leave(host, { ...target, treasureId: 'stale' }).data.error.code, 'TREASURE_CHANGED');
    assert.equal(leave(host).status, 200);
    assert.equal(guest.call('GET', '/api/state').data.error.code, 'SESSION_REQUIRED');
    assert.equal(guest.join(code).data.error.code, 'ROOM_NOT_FOUND');
    assert.equal(other.call('GET', '/api/state').status, 200);
    assert.equal(h.store.room(code), undefined);
  } finally { h.store.close(); }
});

test('persistent storage restores identities, shared points and receipts without storing player movement histories', () => {
  const dir=mkdtempSync(join(tmpdir(),'cq-backend-')); const path=join(dir,'test.sqlite');
  try {
    const h=backendHarness(path),a=h.client();a.createOutdoor();a.fix();a.place();a.returnToTreasure();a.aimAtTreasure();a.collect();
    const code=a.data.room.code,id=a.data.receipt.id,cookie=a.cookie;h.store.close();
    const store=new GameStore(path,h.now),handle=createApplication({store});
    const response=handle({path:'/api/state',headers:{cookie}}),data=JSON.parse(response.body);
    assert.equal(data.room.code,code);assert.equal(data.receipt.id,id);assert.equal(data.state.phase,'collected');
    assert.equal(data.report.location.running,false);assert.equal(data.report.location.samples,0);
    assert.deepEqual(store.db.prepare('SELECT name FROM sqlite_master WHERE type=\'table\' ORDER BY name').all().map(r=>r.name),['account_sessions','account_treasures','accounts','claims','players','rooms']);
    store.close();
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test('auth, CSRF, origin, content type and cookie protections apply to business mutations', () => {
  const h=backendHarness(),a=h.client();
  assert.equal(a.call('GET','/api/state').status,401);
  assert.equal(a.call('POST','/api/rooms',{name:'A'},{origin:'https://evil.example'}).status,403);
  assert.equal(a.call('POST','/api/rooms',{name:'A'},{'content-type':'text/plain'}).status,415);
  const created=a.call('POST','/api/rooms',{name:'A'},{origin:'https://field.example.test'});
  assert.match(created.headers['Set-Cookie'],/HttpOnly; SameSite=Strict/);assert.match(created.headers['Set-Cookie'],/; Secure/);
  assert.equal(a.call('POST','/api/location/stop',{}, {'x-csrf-token':'wrong'}).status,403);
  assert.equal(a.call('GET','/api/state',undefined,{'sec-fetch-site':'cross-site'}).status,403);
  assert.equal(a.join('BAD').status,404);h.store.close();
});

test('backend serves only its public allowlist and JSON endpoints, with no repository or database exposure', () => {
  const h=backendHarness();
  for (const path of ['/treasure-lab/','/treasure-lab/client.js','/device-check/']) {
    const response=h.handle({path});assert.equal(response.status,200);assert.match(response.headers['Content-Security-Policy'],/connect-src 'self'/);
  }
  for(const path of ['/server/store.mjs','/.local/campus-quest.sqlite','/.git/config','/package.json','/treasure-lab/../app.js'])assert.equal(h.handle({path}).status,404);
  assert.equal(h.handle({path:'/'}).headers.Location,'/treasure-lab/');
  assert.equal(h.handle({path:'/api/health'}).status,200);h.store.close();
});
