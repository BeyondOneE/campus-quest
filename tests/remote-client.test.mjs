import test from 'node:test';
import assert from 'node:assert/strict';
import { RemoteTreasureSession } from '../public/treasure-lab/client.js';
import { backendHarness } from './helpers/backend-harness.mjs';

function remote(h) {
  const browser=h.client();
  const client=new RemoteTreasureSession({now:h.now,request:async(path,options)=>{
    const result=await browser.call(options.method,path,options.body?JSON.parse(options.body):undefined,
      options.headers['X-CSRF-Token']?{'x-csrf-token':options.headers['X-CSRF-Token']}:{});
    return {ok:result.status<400,status:result.status,json:async()=>result.data};
  }});
  return client;
}

test('real API adapter uses shared server state for two clients, with no offline local collection fallback', async()=>{
  const h=backendHarness(),a=remote(h),b=remote(h);
  assert.equal(await a.connect('Owner'),true);assert.equal(await b.connect('Guest',a.data.room.code),true);
  a.start(h.now());await a.receive({latitude:0,longitude:0,accuracy:5,timestamp:h.now()});assert.equal(await a.place(30),true);
  await b.refresh();assert.equal(b.data.room.treasureId,a.data.room.treasureId);
  for (const north of [65,0,0]) {h.advance(2000);await a.receive({latitude:north/111195,longitude:0,accuracy:5,timestamp:h.now()});}
  assert.equal(a.snapshot(h.now()).eligible,true);assert.equal(await a.collect(),false);
  for(let i=0;i<4;i++){if(i)h.advance(450);await a.aim({heading:a.data.state.guidance.bearingDegrees,pitch:0,timestamp:h.now(),source:'absolute-orientation',cameraLive:true,videoAgeMs:0});}
  assert.equal(await a.collect(),true);
  await b.refresh();assert.ok(b.data.players.find(p=>p.name==='Owner').collected);
  assert.equal(JSON.stringify(a.report(h.now())).includes('latitude'),false);
  b.online=false;assert.equal(b.snapshot(h.now()).eligible,false);h.store.close();
});

test('a position response arriving after stop cannot revive local eligibility',async()=>{
  const h=backendHarness(),a=remote(h);await a.connect('A');a.start(h.now());
  let resolve; const original=a.request;a.request=(path,options)=>path==='/api/location'?new Promise(r=>{resolve=()=>original(path,options).then(r);}):original(path,options);
  const pending=a.receive({latitude:0,longitude:0,accuracy:5,timestamp:h.now()});
  await Promise.resolve();a.stop(h.now());resolve();await pending;await a.tail;
  assert.equal(a.active,false);assert.equal(a.fix,null);assert.equal(a.snapshot(h.now()).eligible,false);h.store.close();
});

test('connection loss and authentication expiry fail closed and stop collection eligibility',async()=>{
  const h=backendHarness(),a=remote(h);await a.connect('A');a.start(h.now());
  a.request=async()=>{throw new Error('Network unavailable');};
  assert.equal(await a.receive({latitude:0,longitude:0,accuracy:5,timestamp:h.now()}),false);assert.equal(a.online,false);
  a.request=async()=>({ok:false,status:401,json:async()=>({error:{message:'Expired'}})});
  await a.refresh();assert.equal(a.connected,false);assert.equal(a.active,false);h.store.close();
});

test('an aim response arriving after stop cannot restore direction or claim readiness',async()=>{
  const h=backendHarness(),a=remote(h);
  try {
    await a.connect('A');a.start(h.now());
    await a.receive({latitude:0,longitude:0,accuracy:5,timestamp:h.now()});await a.place(30);
    for(const north of [65,0,0]){h.advance(2000);await a.receive({latitude:north/111195,longitude:0,accuracy:5,timestamp:h.now()});}
    const aim={heading:a.data.state.guidance.bearingDegrees,pitch:0,timestamp:h.now(),source:'absolute-orientation',cameraLive:true,videoAgeMs:0};
    let resolve;const original=a.request;
    a.request=(path,options)=>path==='/api/aim'?new Promise(r=>{resolve=()=>original(path,options).then(r);}):original(path,options);
    const pending=a.aim(aim);await Promise.resolve();a.stop(h.now());resolve();
    assert.equal(await pending,false);await a.tail;
    assert.equal(a.active,false);assert.equal(a.snapshot(h.now()).canNavigate,false);
    assert.equal(a.snapshot(h.now()).canClaim,false);assert.equal(a.snapshot(h.now()).guidance,null);
    assert.equal(a.data.report.location.running,false);
  } finally {h.store.close();}
});

test('account adapter adopts a guest room, resumes on another device and clears state on logout',async()=>{
  const h=backendHarness(),a=remote(h),b=remote(h);
  try {
    await a.resume();assert.equal(a.connected,false);assert.equal(a.lastError,'');
    await a.connect('Temporary player');const id=a.data.player.id,code=a.data.room.code;
    assert.equal(await a.authenticate('register','adapter_user','fixture-only password 123'),true);
    assert.equal(a.account.username,'adapter_user');assert.equal(a.data.player.id,id);
    assert.equal(await b.authenticate('login','adapter_user','fixture-only password 123'),true);
    assert.equal(b.data.player.id,id);assert.equal(b.data.room.code,code);assert.equal(b.active,false);
    assert.equal(await b.connect('',code),true);assert.equal(b.data.players.length,1);
    assert.equal(await a.logout(),true);assert.equal(a.account,null);assert.equal(a.connected,false);assert.equal(a.data,null);
    await b.refresh();assert.equal(b.connected,true);assert.equal(b.account.username,'adapter_user');
  } finally {h.store.close();}
});
