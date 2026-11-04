import test from 'node:test';
import assert from 'node:assert/strict';
import { AimHold, cameraPose, projectTreasure, AR_DEFAULTS } from '../public/treasure-lab/ar.js';
import { bearingDegrees } from '../public/treasure-lab/model.js';
import { backendHarness } from './helpers/backend-harness.mjs';
import { harness, cameraStream } from './helpers/treasure-harness.mjs';

// All geometry, positions, sensor events and streams below are isolated fixtures.
const pose = (heading, beta = 90, angle = 0, previous = null) => cameraPose({ alpha: (360 - heading) % 360,
  beta, gamma: 0, webkitCompassHeading: heading, webkitCompassAccuracy: 5 }, 1000, angle, previous);
const sample = (heading, timestamp, extra = {}) => ({ heading, pitch: 0, timestamp, source: 'absolute-orientation', cameraLive: true, videoAgeMs: 0, ...extra });

test('bearing handles compass quadrants, coincident points and the date line', () => {
  const at = { latitude: 0, longitude: 0 };
  for (const [latitude,longitude,expected] of [[1,0,0],[0,1,90],[-1,0,180],[0,-1,270]]) {
    assert.ok(Math.abs(bearingDegrees(at,{latitude,longitude})-expected)<.001);
  }
  assert.equal(bearingDegrees(at,at),null);
  assert.equal(bearingDegrees({latitude:0,longitude:179},{latitude:0,longitude:-179}),90);
});

test('rear-camera projection follows heading, tilt and screen rotation instead of pinning to screen centre', () => {
  assert.ok(Math.abs(pose(90).heading-90)<.001);
  assert.ok(projectTreasure(pose(0),0).visible);
  assert.ok(projectTreasure(pose(0),15).x>0);
  assert.equal(projectTreasure(pose(180),0).visible,false);
  assert.ok(Math.abs(projectTreasure(pose(0,70),0).y)>0);
  const portrait=projectTreasure(pose(0),15), landscape=projectTreasure(pose(0,90,90),15);
  assert.ok(portrait.x>0);assert.ok(Math.abs(landscape.x)<.001);assert.ok(landscape.y<0);
});

test('north filtering takes the short path; relative, null, inaccurate and downward poses never count', () => {
  const previous=pose(359), next=cameraPose({alpha:359,beta:90,gamma:0,webkitCompassHeading:1,webkitCompassAccuracy:5},1050,0,previous);
  assert.ok(next.heading>358 || next.heading<2);
  for(const event of [{alpha:0,beta:90,gamma:0,absolute:false}, {alpha:null,beta:90,gamma:0,absolute:true},
    {alpha:0,beta:90,gamma:0,webkitCompassHeading:0,webkitCompassAccuracy:-1},
    {alpha:0,beta:90,gamma:0,webkitCompassHeading:0,webkitCompassAccuracy:40},
    {alpha:0,beta:0,gamma:0,absolute:true}]) assert.ok(cameraPose(event,1000).error);
});

test('aim needs distinct fresh samples over receipt time; timers, stale frames, pitch and resets cannot bypass it', () => {
  const aim=new AimHold();aim.observe(sample(359,1000),1,1000);
  assert.equal(aim.snapshot(5000).ready,false);
  aim.observe(sample(359,1000),1,1400);assert.equal(aim.samples,1);
  aim.reset();for(let i=0;i<4;i++) aim.observe(sample(1,1000+i*450),1,1000+i*450);
  assert.equal(aim.snapshot(2350).ready,true);
  assert.equal(aim.snapshot(2350+AR_DEFAULTS.maxGap+1).ready,false);
  for(const invalid of [sample(90,2400),sample(1,2400,{pitch:35}),sample(1,2400,{cameraLive:false}),
    sample(1,2400,{videoAgeMs:800}),sample(1,2400,{source:'relative'}),sample(1,200)]) {
    aim.observe(invalid,1,2500);assert.equal(aim.snapshot(2500).ready,false);
  }
});

test('server allows distant direction guidance, freezes the nearby bearing and requires its own aim hold', () => {
  const h=backendHarness(),a=h.client();
  try {
    a.create();a.fix();a.place();h.advance(1000);a.fix(65);
    assert.equal(a.data.state.canNavigate,true);assert.equal(a.data.state.eligible,false);
    assert.equal(a.data.state.guidance.mode,'approach');
    h.advance(1000);a.fix(0);h.advance(2000);a.fix(0);
    const bearing=a.data.state.guidance.bearingDegrees;
    assert.equal(a.data.state.guidance.mode,'nearby');assert.equal(bearing,180);
    h.advance(100);a.fix(-1);assert.equal(a.data.state.guidance.bearingDegrees,bearing,'small GPS changes do not swing a nearby target');
    a.call('POST','/api/aim',{treasureId:a.data.room.treasureId,sample:sample(bearing,h.now(),{heldForMs:999999})});
    assert.equal(a.collect().data.error.code,'AIM_REQUIRED');
    a.aimAtTreasure();assert.equal(a.data.state.canClaim,true);
    h.advance(1000);assert.equal(a.collect().data.error.code,'AIM_REQUIRED');
    a.aimAtTreasure();assert.equal(a.collect().status,200);
    assert.equal(/latitude|longitude/.test(JSON.stringify(a.data)),false);
  } finally {h.store.close();}
});

test('aim samples are isolated by player, checked for CSRF / round and invalidated by stop', () => {
  const h=backendHarness(),a=h.client(),b=h.client();
  try {
    a.create();b.join(a.data.room.code);a.fix();a.place();b.call('GET','/api/state');
    a.returnToTreasure();b.returnToTreasure();a.aimAtTreasure();
    assert.equal(b.collect().data.error.code,'AIM_REQUIRED');
    assert.equal(a.call('POST','/api/aim',{treasureId:a.data.room.treasureId,sample:null},{'x-csrf-token':'wrong'}).status,403);
    const old=a.data.room.treasureId;a.place();
    assert.equal(a.call('POST','/api/aim',{treasureId:old,sample:sample(180,h.now())}).status,409);
    a.returnToTreasure();a.aimAtTreasure();a.call('POST','/api/location/stop',{});
    assert.equal(a.data.state.canNavigate,false);assert.equal(a.data.state.canClaim,false);
  } finally {h.store.close();}
});

test('camera opens after departure, shows only an arrow far away and reveals a nearby target', async () => {
  const h=harness({getUserMedia:()=>Promise.resolve(cameraStream())});
  h.click('start-location');h.fix();h.click('place');h.advance(1000);h.fix({north:65});
  assert.equal(h.node('start-camera').disabled,false);await h.click('start-camera');h.frame();h.direction();
  assert.equal(h.node('ar-arrow').hidden,false);assert.equal(h.node('treasure').hidden,true);assert.equal(h.node('claim').hidden,true);
  h.advance(1000);h.fix();h.advance(2000);h.fix();h.frame();h.direction();
  assert.equal(h.node('treasure').hidden,false);assert.equal(h.node('claim').disabled,true);
  h.aimAtTreasure();assert.equal(h.node('claim').disabled,false);h.click('claim');
  assert.equal(h.session.phase,'collected');assert.equal(h.directionListening,false);
});

test('turning away, stale orientation and stalled video cancel claiming even with valid GPS', async () => {
  const h=harness({getUserMedia:()=>Promise.resolve(cameraStream())});h.unlock();await h.click('start-camera');h.aimAtTreasure();
  assert.equal(h.node('claim').disabled,false);
  h.advance(50);h.direction({heading:90});assert.equal(h.node('claim').disabled,true);assert.equal(h.node('treasure').hidden,true);
  h.advance(1600);h.frame();assert.equal(h.node('treasure').hidden,true);
  h.direction();h.aimAtTreasure();assert.equal(h.node('claim').disabled,false);
  h.advance(800);h.direction();assert.equal(h.node('claim').disabled,true,'no recent video frames');
});

test('direction denial is retryable and backgrounded permission cannot attach a late sensor listener', async () => {
  let permissions=0;
  const h=harness({getUserMedia:()=>Promise.resolve(cameraStream()),directionPermission:()=>Promise.resolve(++permissions===1?'denied':'granted')});
  h.unlock();await h.click('start-camera');h.frame();h.direction();
  assert.equal(h.node('treasure').hidden,true);assert.equal(h.node('claim').disabled,true);assert.equal(h.node('direction-retry').hidden,false);
  h.click('direction-retry');await Promise.resolve();h.direction();h.frame();assert.equal(h.node('treasure').hidden,false);
  h.background();assert.equal(h.directionListening,false);
  let resolve;const pending=harness({getUserMedia:()=>Promise.resolve(cameraStream()),directionPermission:()=>new Promise(r=>{resolve=r;})});
  pending.unlock();await pending.click('start-camera');pending.background();resolve('granted');await Promise.resolve();
  assert.equal(pending.directionListening,false);assert.equal(pending.node('claim').disabled,true);
});

test('position expiry while a camera prompt delays rendering releases late capture and orientation listeners', async () => {
  let resolve;const stream=cameraStream(),h=harness({getUserMedia:()=>new Promise(r=>{resolve=r;})});
  h.unlock();const pending=h.click('start-camera');await Promise.resolve();
  assert.equal(h.directionListening,true);
  h.advance(16000,false);resolve(stream);await pending;
  assert.equal(stream.stops,1);assert.equal(h.directionListening,false);
  assert.equal(h.node('claim').disabled,true);assert.equal(h.node('treasure').hidden,true);
});
