import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalSearchPose, projectTreasure, validAim } from '../public/treasure-lab/ar.js';
import { NEAR_DEFAULTS } from '../public/treasure-lab/model.js';
import { backendHarness } from './helpers/backend-harness.mjs';
import { harness, cameraStream } from './helpers/treasure-harness.mjs';
// All coordinates, motion samples and streams in this file are isolated fixtures, never phone evidence.
function locked(){const h=backendHarness(),a=h.client();a.createOutdoor();a.fix();a.call('POST','/api/treasure',{radius:3,treasureId:a.data.room.treasureId});h.advance(100);a.fix(20);h.advance(100);a.fix(12);h.advance(2000);a.fix(12);return {h,a};}
const aim=(a,now,extra={})=>({heading:45,pitch:0,timestamp:now,cameraLive:true,videoAgeMs:0,source:'relative-orientation',frameId:'fixture-'+a.data.player.id,encounterId:a.data.state.nearField?.id,...extra});
const send=(a,sample)=>a.call('POST','/api/aim',{sample,treasureId:a.data.room.treasureId});

test('near search needs departure and stable fresh fixes within 15 m, then locks independently of the 3 m boundary',()=>{
 const {h,a}=locked();try{
  assert.equal(a.data.state.eligible,true);assert.ok(a.data.state.distance>3);const id=a.data.state.nearField.id;
  assert.equal(a.data.state.guidance.frame,'local');assert.equal(a.data.state.guidance.bearingDegrees,45);
  for(const [north,accuracy] of [[3.1,5],[29,5],[-25,5],[6,100]]){h.advance(100);a.fix(north,accuracy);assert.equal(a.data.state.nearField.id,id);assert.equal(a.data.state.eligible,true);}
  a.aimAtTreasure();assert.equal(a.collect().status,200);
 }finally{h.store.close();}
 const t=backendHarness(),b=t.client();try{
  b.createOutdoor();b.fix();b.place();t.advance(100);b.fix(65);t.advance(100);b.fix(16);t.advance(2100);b.fix(16);assert.equal(b.data.state.eligible,false);
  t.advance(100);b.fix(12);b.fix(12);t.advance(2100);b.fix(12,100);assert.equal(b.data.state.eligible,false);
  t.advance(100);b.fix(12);t.advance(2100);b.fix(12);assert.equal(b.data.state.eligible,true);
 }finally{t.store.close();}
});

test('GPS expiry and transient loss preserve local eligibility and allow a fresh live aim to collect',()=>{
 const {h,a}=locked();try{
  const id=a.data.state.nearField.id;h.advance(16000);a.call('GET','/api/state');assert.equal(a.data.state.kind,'stale');assert.equal(a.data.state.canNavigate,true);
  a.call('POST','/api/location/stop',{transient:true});assert.equal(a.data.state.nearField.id,id);assert.equal(a.data.report.location.running,true);
  a.aimAtTreasure();assert.equal(a.collect().status,200);assert.equal(a.collect().data.collection.repeated,true);
 }finally{h.store.close();}
});

test('a single far GPS jump does not cancel; confirmed coarse departure and 90 second expiry do',()=>{
 const {h,a}=locked();try{
  const id=a.data.state.nearField.id;h.advance(100);a.fix(80);assert.equal(a.data.state.nearField.id,id);
  h.advance(3000);a.fix(80);assert.equal(a.data.state.nearField,null);assert.equal(a.data.state.eligible,false);
  h.advance(100);a.fix(12);h.advance(2000);a.fix(12);assert.notEqual(a.data.state.nearField.id,id);
  h.advance(NEAR_DEFAULTS.duration);assert.equal(a.collect().status,409);a.call('GET','/api/state');assert.equal(a.data.state.nearField,null);
  assert.equal(send(a,aim(a,h.now(),{encounterId:id})).data.accepted,false);
 }finally{h.store.close();}
});

test('encounter IDs and calibration frames isolate aiming; absolute compass samples cannot claim local targets',()=>{
 const {h,a}=locked();try{
  const id=a.data.state.nearField.id;
  for(const extra of [{source:'absolute-orientation'},{encounterId:'old'},{frameId:''},{timestamp:h.now()-2000}])assert.equal(send(a,aim(a,h.now(),extra)).data.accepted,false);
  a.aimAtTreasure();assert.equal(a.data.state.canClaim,true);assert.equal(send(a,aim(a,h.now()+1,{frameId:'wrong-frame'})).data.accepted,false);assert.equal(a.data.state.canClaim,false);
  a.call('POST','/api/aim',{sample:null,cancelEncounter:true,encounterId:'other',treasureId:a.data.room.treasureId});assert.equal(a.data.state.nearField.id,id);
  a.call('POST','/api/aim',{sample:null,cancelEncounter:true,encounterId:id,treasureId:a.data.room.treasureId});assert.equal(a.data.state.nearField,null);
  h.advance(100);a.fix(12);h.advance(2000);a.fix(12);assert.notEqual(a.data.state.nearField.id,id);
  assert.equal(send(a,aim(a,h.now(),{encounterId:id})).data.accepted,false);
  a.call('POST','/api/location/stop',{});assert.equal(a.data.state.eligible,false);
 }finally{h.store.close();}
});

test('relative orientation ignores unreliable north, calibrates once and moves the projected target with turning',()=>{
 const t=new LocalSearchPose();const input=(alpha)=>({alpha,beta:90,gamma:0,absolute:false,webkitCompassHeading:87,webkitCompassAccuracy:100});
 let p=t.orientation(input(120),1000,0);assert.ok(Math.abs(p.heading)<.001);assert.equal(p.source,'relative-orientation');
 p=t.orientation(input(75),1050,0);assert.ok(Math.abs(p.heading-45)<.001);assert.ok(projectTreasure(p,45).error<.001);
 p=t.orientation(input(0),1100,0);assert.equal(projectTreasure(p,45).visible,false);
 assert.ok(t.orientation({alpha:null,beta:90,gamma:0},1200,0).error);
});

test('gyroscope integration uses a gravity-initialised rotational frame and fails closed on missing or interrupted samples',()=>{
 const t=new LocalSearchPose(),still={rotationRate:{alpha:0,beta:0,gamma:0},accelerationIncludingGravity:{x:0,y:9.8,z:0}};
 const initial=t.motion(still,1000,0);assert.equal(initial.source,'local-gyro');assert.ok(Math.abs(initial.heading)<.001);
 const turned=t.motion({rotationRate:{alpha:0,beta:0,gamma:-90}},1500,0);assert.ok(Math.abs(turned.heading-45)<.001);assert.ok(projectTreasure(turned,45).error<.001);
 assert.equal(turned.frameId,initial.frameId);assert.ok(!('latitude' in turned));
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);assert.ok(Math.abs(dot(turned.forward,turned.right))<1e-9);assert.ok(Math.abs(dot(turned.forward,turned.up))<1e-9);
 assert.ok(t.motion(still,2100,0).error);assert.ok(t.motion(still,2110,0).error);t.reset();assert.ok(!t.motion(still,2200,90).error);
 assert.ok(new LocalSearchPose().motion({rotationRate:{alpha:null,beta:0,gamma:0}},1000,0).error);
 assert.equal(validAim({...turned,timestamp:1500,cameraLive:true,videoAgeMs:0},1500),true);
});

test('real motion-event path can search and claim with poor compass and lost GPS; close releases the encounter and sensors',async()=>{
 const stream=cameraStream(),h=harness({getUserMedia:()=>Promise.resolve(stream),motionPermission:()=>Promise.resolve('granted')});h.unlock();await h.click('start-camera');h.frame();
 assert.equal(h.motionListening,true);h.direction({accuracy:100});h.motion();const id=h.session.encounter.id;
 h.advance(500);h.frame();h.motion({rotationRate:{alpha:0,beta:0,gamma:-90}});h.geoError(3);
 assert.equal(h.session.encounter.id,id);assert.equal(h.node('gps-spinner').hidden,true);
 for(let i=0;i<3;i++){h.advance(500);h.frame();h.motion();}
 assert.equal(h.node('claim').disabled,false);assert.equal(h.session.encounter.source,'local-gyro');h.click('claim');assert.equal(h.session.collectionCount,1);assert.equal(h.motionListening,false);assert.equal(stream.stops,1);
 const other=harness({getUserMedia:()=>Promise.resolve(cameraStream()),motionPermission:()=>Promise.resolve('granted')});other.unlock();await other.click('start-camera');other.motion();other.click('stop-camera');assert.equal(other.session.encounter,null);assert.equal(other.motionListening,false);
});
