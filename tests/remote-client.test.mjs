import test from 'node:test';
import assert from 'node:assert/strict';
import { RemoteTreasureSession } from '../public/treasure-lab/client.js';
import { backendHarness } from './helpers/backend-harness.mjs';
import { harness } from './helpers/treasure-harness.mjs';

function remote(h) {
  const browser=h.client();
  const client=new RemoteTreasureSession({now:h.now,request:async(path,options)=>{
    const result=await browser.call(options.method,path,options.body?JSON.parse(options.body):undefined,
      options.headers['X-CSRF-Token']?{'x-csrf-token':options.headers['X-CSRF-Token']}:{});
    return {ok:result.status<400,status:result.status,json:async()=>result.data};
  }});
  return client;
}

async function connectOutdoor(session, name) {
  assert.equal(await session.connect(name), true);
  assert.equal(await session.setMode('gps'), true);
}

test('real API adapter uses shared server state for two clients, with no offline local collection fallback', async()=>{
  const h=backendHarness(),a=remote(h),b=remote(h);
  await connectOutdoor(a,'Owner');assert.equal(await b.connect('Guest',a.data.room.code),true);
  a.start(h.now());await a.receive({latitude:0,longitude:0,accuracy:5,timestamp:h.now()});assert.equal(await a.place(30),true);
  await b.refresh();assert.equal(b.data.room.treasureId,a.data.room.treasureId);
  const { cardId } = a.data.room;
  assert.equal(b.data.room.cardId, cardId);
  const ui = harness({ session: b });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(ui.node('ar-chest-art').getAttribute('href'), `#chest-${cardId}`);
  assert.equal(ui.node('claimed-chest-crest').getAttribute('href'), `#crest-${cardId}`);
  for (const north of [65,0,0]) {h.advance(2000);await a.receive({latitude:north/111195,longitude:0,accuracy:5,timestamp:h.now()});}
  assert.equal(a.snapshot(h.now()).eligible,true);assert.equal(await a.collect(),false);
  for(let i=0;i<4;i++){if(i)h.advance(450);await a.aim({heading:a.data.state.guidance.bearingDegrees,pitch:0,timestamp:h.now(),source:'relative-orientation',frameId:'fixture-remote',encounterId:a.data.state.nearField?.id,cameraLive:true,videoAgeMs:0});}
  assert.equal(await a.collect(),true);
  await b.refresh();assert.ok(b.data.players.find(p=>p.name==='Owner').collected);
  assert.equal(JSON.stringify(a.report(h.now())).includes('latitude'),false);
  b.online=false;assert.equal(b.snapshot(h.now()).eligible,false);h.store.close();
});

test('a position response arriving after stop cannot revive local eligibility',async()=>{
  const h=backendHarness(),a=remote(h);await connectOutdoor(a,'A');a.start(h.now());
  let resolve; const original=a.request;a.request=(path,options)=>path==='/api/location'?new Promise(r=>{resolve=()=>original(path,options).then(r);}):original(path,options);
  const pending=a.receive({latitude:0,longitude:0,accuracy:5,timestamp:h.now()});
  await Promise.resolve();a.stop(h.now());resolve();await pending;await a.tail;
  assert.equal(a.active,false);assert.equal(a.fix,null);assert.equal(a.snapshot(h.now()).eligible,false);h.store.close();
});

test('connection loss and authentication expiry fail closed and stop collection eligibility',async()=>{
  const h=backendHarness(),a=remote(h);await connectOutdoor(a,'A');a.start(h.now());
  a.request=async()=>{throw new Error('Network unavailable');};
  assert.equal(await a.receive({latitude:0,longitude:0,accuracy:5,timestamp:h.now()}),false);assert.equal(a.online,false);
  a.request=async()=>({ok:false,status:401,json:async()=>({error:{message:'Expired'}})});
  await a.refresh();assert.equal(a.connected,false);assert.equal(a.active,false);h.store.close();
});

test('an aim response arriving after stop cannot restore direction or claim readiness',async()=>{
  const h=backendHarness(),a=remote(h);
  try {
    await connectOutdoor(a,'A');a.start(h.now());
    await a.receive({latitude:0,longitude:0,accuracy:5,timestamp:h.now()});await a.place(30);
    for(const north of [65,0,0]){h.advance(2000);await a.receive({latitude:north/111195,longitude:0,accuracy:5,timestamp:h.now()});}
    const aim={heading:a.data.state.guidance.bearingDegrees,pitch:0,timestamp:h.now(),source:'relative-orientation',frameId:'fixture-remote',encounterId:a.data.state.nearField?.id,cameraLive:true,videoAgeMs:0};
    let resolve;const original=a.request;
    a.request=(path,options)=>path==='/api/aim'?new Promise(r=>{resolve=()=>original(path,options).then(r);}):original(path,options);
    const pending=a.aim(aim);await Promise.resolve();a.stop(h.now());resolve();
    assert.equal(await pending,false);await a.tail;
    assert.equal(a.active,false);assert.equal(a.snapshot(h.now()).canNavigate,false);
    assert.equal(a.snapshot(h.now()).canClaim,false);assert.equal(a.snapshot(h.now()).guidance,null);
    assert.equal(a.data.report.location.running,false);
  } finally {h.store.close();}
});

test('account adoption keeps the guest room and confirmed host sign-out closes it across devices',async()=>{
  const h=backendHarness(),a=remote(h),b=remote(h);
  try {
    await a.resume();assert.equal(a.connected,false);assert.equal(a.lastError,'');
    await a.connect('Temporary player');const id=a.data.player.id,code=a.data.room.code;
    assert.equal(await a.authenticate('register','adapter_user','fixture-only password 123'),true);
    assert.equal(a.account.username,'adapter_user');assert.equal(a.data.player.id,id);
    assert.equal(await b.authenticate('login','adapter_user','fixture-only password 123'),true);
    assert.equal(b.connected,false);
    assert.equal(await b.connect('',code),true);
    assert.equal(b.data.player.id,id);assert.equal(b.data.players.length,1);assert.equal(b.active,false);

    const ui = harness({ session: a });
    await new Promise(resolve => setImmediate(resolve));
    ui.click('open-menu');
    ui.click('logout');
    assert.equal(ui.node('room-exit-title').textContent, 'Sign out and leave?');
    assert.match(ui.node('room-exit-details').textContent, /closes the room/);
    ui.click('cancel-room-exit');
    assert.equal(a.connected, true);
    assert.ok(h.store.room(code));
    ui.click('logout');
    await ui.click('confirm-room-exit');
    assert.equal(ui.node('app').dataset.screen, 'entry');
    assert.equal(a.account,null);assert.equal(a.connected,false);assert.equal(a.data,null);
    await b.refresh();assert.equal(b.connected,false);assert.equal(b.account.username,'adapter_user');
    assert.equal(await b.connect('',code), false);
  } finally {h.store.close();}
});

test('Leave room confirms host disbanding and returns the remaining guest to room selection', async () => {
  const h = backendHarness(), host = remote(h), guest = remote(h);
  try {
    assert(await host.connect('Host'));
    const { code } = host.data.room;
    assert(await guest.connect('Guest', code));
    const hostUi = harness({ session: host }), guestUi = harness({ session: guest });
    await new Promise(resolve => setImmediate(resolve));
    hostUi.click('open-menu');
    hostUi.click('leave-room');
    assert.equal(hostUi.node('sheet-room-exit').hidden, false);
    assert.match(hostUi.node('room-exit-details').textContent, /Everyone returns/);
    await hostUi.click('confirm-room-exit');
    assert.equal(hostUi.node('app').dataset.screen, 'entry');
    assert.equal(hostUi.node('sheet-room-exit').hidden, true);
    await guest.refresh();
    guestUi.render();
    assert.equal(guestUi.node('app').dataset.screen, 'entry');
    assert.equal(await guest.connect('Guest', code), false);
  } finally { h.store.close(); }
});

test('demo reset returns the host and signed-in participants to room selection without signing out', async () => {
  const h = backendHarness(), owner = remote(h), guest = remote(h), other = remote(h);
  try {
    assert(await owner.authenticate('register', 'demo_host', 'fixture-only password 123'));
    assert(await guest.authenticate('register', 'demo_guest', 'fixture-only password 123'));
    assert(await other.connect('Other host'));
    const savedRoom = other.data.room.code;
    await connectOutdoor(owner, '');
    const { code } = owner.data.room;
    assert(await guest.connect('', code));
    guest.start(h.now());
    assert(await guest.receive({ latitude: 0, longitude: 0, accuracy: 5, timestamp: h.now() }));

    const ui = harness({ session: owner });
    await new Promise(resolve => setImmediate(resolve));
    ui.click('start-location');
    ui.node('notes').value = 'Demo note';
    ui.node('guide-input').value = 'Draft guide question';
    ui.node('radius').value = '80';
    ui.click('open-menu');
    ui.click('open-tools');
    assert.equal(ui.node('open-reset').hidden, false);
    ui.click('open-reset');
    assert.equal(ui.node('sheet-room-exit').hidden, false);
    ui.click('cancel-room-exit');
    assert.equal(ui.node('sheet-tools').hidden, false);
    assert.equal(owner.active, true);
    assert.equal(owner.data.room.code, code);
    assert.equal(ui.node('notes').value, 'Demo note');
    ui.click('open-reset');
    const reset = ui.click('confirm-room-exit');
    assert.equal(ui.node('confirm-room-exit').textContent, 'Resetting demo…');
    assert.equal(ui.node('confirm-room-exit').disabled, true);
    await reset;
    assert.equal(ui.node('app').dataset.screen, 'entry');
    assert.equal(ui.node('sheet-room-exit').hidden, true);
    assert.equal(ui.node('notes').value, '');
    assert.equal(ui.node('guide-input').value, '');
    assert.equal(ui.node('radius').value, '30');
    assert.ok(ui.cleared.includes(0));
    assert.equal(owner.account.username, 'demo_host');
    assert.equal(owner.events.length, 0);
    assert.equal(owner.mode, 'indoor-ronin');

    await guest.refresh();
    assert.equal(guest.connected, false);
    assert.equal(guest.active, false);
    assert.equal(guest.fix, null);
    assert.equal(guest.account.username, 'demo_guest');
    await owner.resume(); await guest.resume();
    assert.equal(owner.connected, false);
    assert.equal(guest.connected, false);
    assert(await owner.connect('', savedRoom));
    assert(await guest.connect('', savedRoom));
  } finally { h.store.close(); }
});
