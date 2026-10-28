import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as measurements from '../public/device-check/measurements.js';

// Exercise the page controller against controlled browser API boundaries, without
// requiring camera/location access or treating fake samples as hardware evidence.
function harness({getUserMedia, orientationPermission, motionPermission} = {}) {
  const elements = new Map(), listeners = new Map(), windowListeners = new Map();
  const node = id => {
    if (!elements.has(id)) elements.set(id, {textContent:'', dataset:{}, style:{}, hidden:false, disabled:false, checked:false, value:'', currentTime:0, readyState:0,
      classList:{add(){}}, addEventListener(name,fn){this[name]=fn;}, pause(){this.paused=true;}, play(){this.paused=false;return Promise.resolve();}, append(){}, click(){}, remove(){}});
    return elements.get(id);
  };
  const document = {hidden:false,visibilityState:'visible',getElementById:node,body:{append(){}},createElement:()=>node('download'),addEventListener:(name,fn)=>listeners.set(name,fn)};
  const requestCounts = {orientation:0,motion:0}, cleared=[];
  const window = {isSecureContext:true,innerWidth:390,innerHeight:844,
    DeviceOrientationEvent:{requestPermission(){requestCounts.orientation++;return orientationPermission ?? Promise.resolve('granted');}},
    DeviceMotionEvent:{requestPermission(){requestCounts.motion++;return motionPermission ?? Promise.resolve('granted');}},
    addEventListener:(name,fn)=>windowListeners.set(name,fn), removeEventListener:(name)=>windowListeners.delete(name)};
  const navigator = {userAgent:'iPhone Version/27.2 Mobile Safari/604.1',mediaDevices:{getUserMedia:getUserMedia ?? (()=>Promise.reject({name:'NotAllowedError'}))},
    geolocation:{watchPosition(success,error){navigator.geoSuccess=success;navigator.geoError=error;return 0;},clearWatch:id=>cleared.push(id)}};
  let now=100, exported=null;
  const context=vm.createContext({...measurements,document,window,navigator,performance:{now:()=>now},setInterval:()=>1,clearInterval(){},setTimeout(){},URL:{createObjectURL(blob){exported=blob;return 'blob:test';},revokeObjectURL(){}},Blob,console});
  const source=readFileSync(new URL('../public/device-check/probe.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'');
  vm.runInContext(source,context);
  return {node,document,navigator,requestCounts,windowListeners,cleared,report:async()=>JSON.parse(await exported.text()),advance:ms=>{now+=ms;vm.runInContext('render()',context);},
    background(){document.hidden=true;document.visibilityState='hidden';listeners.get('visibilitychange')();},
    foreground(){document.hidden=false;document.visibilityState='visible';listeners.get('visibilitychange')();}};
}
test('both iOS permission requests start during the same click', async()=>{
  let resolve;
  const h=harness({orientationPermission:new Promise(r=>{resolve=r;})});
  const pending=h.node('start-sensors').click();
  assert.deepEqual(h.requestCounts,{orientation:1,motion:1});
  resolve('granted');await pending;
  assert.equal(h.windowListeners.has('deviceorientation'),true);
});
test('empty events do not show success; valid zero rotation does; stale samples stop the live indication',async()=>{
  const h=harness();await h.node('start-sensors').click();
  h.windowListeners.get('deviceorientation')({alpha:null,beta:null,gamma:null});
  h.windowListeners.get('devicemotion')({rotationRate:{alpha:null,beta:null,gamma:null}});h.advance(100);
  assert.equal(h.node('sensor-status').textContent,'等待有效数据');
  h.windowListeners.get('deviceorientation')({alpha:0,beta:0,gamma:0});
  h.windowListeners.get('devicemotion')({rotationRate:{alpha:0,beta:0,gamma:0}});h.advance(100);
  assert.equal(h.node('sensor-status').textContent,'姿态与运动有效');
  h.advance(3000);assert.equal(h.node('sensor-status').textContent,'等待有效数据');
});
test('a camera stream arriving after cancellation is released',async()=>{
  let resolve,stops=0;const h=harness({getUserMedia:()=>new Promise(r=>{resolve=r;})});
  const pending=h.node('start-camera').click();h.node('stop-camera').click();
  resolve({getTracks:()=>[{stop(){stops++;}}]});await pending;
  assert.equal(stops,1);assert.equal(h.node('camera').srcObject,null);
});
test('backgrounding stops a watch with ID zero and detaches sensors; foreground never silently restarts',async()=>{
  const h=harness();await h.node('start-sensors').click();h.node('start-location').click();
  h.background();assert.deepEqual(h.cleared,[0]);assert.equal(h.windowListeners.has('devicemotion'),false);
  h.foreground();assert.equal(h.windowListeners.has('deviceorientation'),false);
  assert.equal(h.node('stop-location').disabled,true);
});
test('permission requests completing in the background cannot restart sensors',async()=>{
  let resolve;const h=harness({orientationPermission:new Promise(r=>{resolve=r;})});
  const pending=h.node('start-sensors').click();h.background();resolve('granted');await pending;
  assert.equal(h.windowListeners.has('deviceorientation'),false);
});
test('camera denial is recoverable and does not claim a live picture',async()=>{
  const h=harness();await h.node('start-camera').click();
  assert.equal(h.node('camera-status').textContent,'未开启');
  assert.equal(h.node('start-camera').disabled,false);
  assert.equal(h.node('stop-camera').disabled,true);
});
test('a generated report retains measured precision but omits coordinates by default',async()=>{
  const h=harness();h.node('start-location').click();
  h.navigator.geoSuccess({coords:{latitude:31.123456,longitude:121.123456,accuracy:12},timestamp:0});
  h.node('download-report').click();const report=await h.report();
  assert.equal(report.location.receivedSamples,1);
  assert.equal(report.location.lastReading.accuracyMeters,12);
  assert.equal('latitude' in report.location.lastReading,false);
  assert.equal('longitude' in report.location.lastReading,false);
  assert.equal(report.manualChecks.locationAcceptable,false);
});
test('precise coordinate export requires the explicit checkbox',async()=>{
  const h=harness();h.node('start-location').click();
  h.navigator.geoSuccess({coords:{latitude:31.123456,longitude:121.123456,accuracy:12},timestamp:0});
  h.node('include-location').checked=true;h.node('download-report').click();const report=await h.report();
  assert.equal(report.location.lastReading.latitude,31.123456);
  assert.equal(report.location.lastReading.longitude,121.123456);
});
