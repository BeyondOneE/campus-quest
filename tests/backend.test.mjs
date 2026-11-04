import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backendHarness } from './helpers/backend-harness.mjs';
import { GameStore } from '../server/store.mjs';
import { createApplication } from '../server/app.mjs';

test('two independent guest sessions share one treasure while only the owner can place it', () => {
  const h = backendHarness(), owner = h.client(), guest = h.client();
  assert.equal(owner.create().status, 201); assert.equal(guest.join(owner.data.room.code).status, 201);
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
  const h = backendHarness(), a = h.client(), b = h.client(); a.create(); b.join(a.data.room.code);
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
  const h = backendHarness(), a = h.client(); a.create();
  assert.equal(a.fix(0,100).status, 200); assert.equal(a.place().status,409);
  h.advance(1000); a.fix(); a.place();
  assert.equal(a.fix(65,5,h.now()-16000).status,400);
  assert.equal(a.fix(65,5,h.now()+6000).status,400);
  const invalid = a.call('POST','/api/location',{treasureId:a.data.room.treasureId,fix:{latitude:200,longitude:0,accuracy:0,timestamp:h.now()}});
  assert.equal(invalid.status,400);
  a.returnToTreasure(); h.advance(16000); assert.equal(a.collect().status,409); h.store.close();
});

test('stopping location invalidates eligibility; re-placement isolates delayed requests from the old round', () => {
  const h=backendHarness(),a=h.client();a.create();a.fix();a.place();a.returnToTreasure();
  a.call('POST','/api/location/stop',{});assert.equal(a.collect().status,409);
  h.advance(1000);a.fix();const old=a.data.room.treasureId;a.place();
  assert.notEqual(a.data.room.treasureId,old);
  assert.equal(a.call('POST','/api/collect',{treasureId:old,cameraLive:true}).status,409);h.store.close();
});

test('persistent storage restores identities, shared points and receipts without storing player movement histories', () => {
  const dir=mkdtempSync(join(tmpdir(),'cq-backend-')); const path=join(dir,'test.sqlite');
  try {
    const h=backendHarness(path),a=h.client();a.create();a.fix();a.place();a.returnToTreasure();a.aimAtTreasure();a.collect();
    const code=a.data.room.code,id=a.data.receipt.id,cookie=a.cookie;h.store.close();
    const store=new GameStore(path,h.now),handle=createApplication({store});
    const response=handle({path:'/api/state',headers:{cookie}}),data=JSON.parse(response.body);
    assert.equal(data.room.code,code);assert.equal(data.receipt.id,id);assert.equal(data.state.phase,'collected');
    assert.equal(data.report.location.running,false);assert.equal(data.report.location.samples,0);
    assert.deepEqual(store.db.prepare('SELECT name FROM sqlite_master WHERE type=\'table\' ORDER BY name').all().map(r=>r.name),['account_sessions','accounts','claims','players','rooms']);
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
