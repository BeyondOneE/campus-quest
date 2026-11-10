import { mountTreasureLab } from '../../public/treasure-lab/app.js';
import { TreasureSession } from '../../public/treasure-lab/model.js';

// Browser boundaries only. These samples never enter the shipped page or count as field evidence.
export function harness({ secure = true, getUserMedia, frameCallbacks = false, animationFrames = false, directionPermission = () => Promise.resolve('granted'),
  motionPermission = null, session = new TreasureSession() } = {}) {
  let calibratedNearId=null;
  let time = 1800000000000, geoSuccess, geoError, nextTimer = 1, nextFrame = 1;
  const elements = new Map(), documentListeners = new Map(), windowListeners = new Map();
  const timers = new Map(), callbacks = new Map(), paintCallbacks = new Map(), cleared = [], cancelledFrames = [];
  const radarMarkers = new Set(['radar-chest', 'radar-edge', 'radar-you']);
  const node = id => {
    if (!elements.has(id)) elements.set(id, { hidden: false, disabled: false, textContent: '', dataset: {},
      value: id === 'radius' ? '30' : '', className: '', attrs: radarMarkers.has(id) ? { hidden: '' } : {}, style: { setProperty(key, value) { this[key] = value; } }, paused: true, readyState: 0, currentTime: 0,
      addEventListener(name, fn) { this[name] = fn; }, setAttribute(name, value) { this.attrs[name] = value; },
      getAttribute(name) { return this.attrs[name] ?? null; },
      replaceChildren(...children) { this.children = children; }, append(...children) { this.children = [...(this.children || []), ...children]; },
      removeAttribute(name) { delete this.attrs[name]; }, pause() { this.paused = true; },
      play() { this.paused = false; return Promise.resolve(); }, click() {}, remove() {} });
    return elements.get(id);
  };
  if (frameCallbacks) {
    node('camera').requestVideoFrameCallback = fn => { const id = nextFrame++; callbacks.set(id, fn); return id; };
    node('camera').cancelVideoFrameCallback = id => { callbacks.delete(id); cancelledFrames.push(id); };
  }
  const document = { hidden: false, visibilityState: 'visible', getElementById: node,
    addEventListener: (name, fn) => documentListeners.set(name, fn),
    body: { append() {} }, createElement: () => node(`created-${elements.size}`) };
  const window = { isSecureContext: secure,
    DeviceOrientationEvent: { requestPermission: directionPermission }, screen: { orientation: { angle: 0 } },
    addEventListener: (name, fn) => {if(!windowListeners.has(name))windowListeners.set(name,new Set());windowListeners.get(name).add(fn);},
    removeEventListener: (name, fn) => {const set=windowListeners.get(name);set?.delete(fn);if(set?.size===0)windowListeners.delete(name);},
    setInterval(fn) { const id = nextTimer++; timers.set(id, fn); return id; },
    clearInterval(id) { timers.delete(id); }, setTimeout() {},
    URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} } };
  if(motionPermission)window.DeviceMotionEvent={requestPermission:motionPermission};
  if (animationFrames) {
    window.requestAnimationFrame = fn => { const id = nextFrame++; paintCallbacks.set(id, fn); return id; };
    window.cancelAnimationFrame = id => paintCallbacks.delete(id);
  }
  let geoRequests = 0, cameraRequests = 0;
  const navigator = { userAgent: 'test-harness-not-physical-evidence',
    geolocation: { watchPosition(success, error) { geoRequests++; geoSuccess = success; geoError = error; return 0; }, clearWatch(id) { cleared.push(id); } },
    mediaDevices: { getUserMedia(options) { cameraRequests++; return getUserMedia ? getUserMedia(options) : Promise.reject({ name: 'NotAllowedError' }); } } };
  const app = mountTreasureLab({ document, window, navigator, now: () => time, session });
  const h = { ...app, node, elements, document, window, navigator, cleared, callbacks, cancelledFrames, paintCallbacks,
    get geoRequests() { return geoRequests; }, get cameraRequests() { return cameraRequests; },
    get directionListening() { return windowListeners.has('deviceorientation'); },
    get motionListening() { return windowListeners.has('devicemotion'); },
    motion(event={rotationRate:{alpha:0,beta:0,gamma:0},accelerationIncludingGravity:{x:0,y:9.8,z:0}}, render = true){for(const fn of windowListeners.get('devicemotion')||[])fn(event);if(render)app.render();},
    click: id => node(id).click(),
    fix({ north = 0, accuracy = 5, timestamp = time } = {}) {
      geoSuccess({ coords: { latitude: north / 111195, longitude: 0, accuracy }, timestamp });
    },
    geoError: code => geoError({ code }),
    advance(ms, render = true) { time += ms; if (render) app.render(); },
    background() { document.hidden = true; document.visibilityState = 'hidden'; documentListeners.get('visibilitychange')(); },
    foreground() { document.hidden = false; document.visibilityState = 'visible'; documentListeners.get('visibilitychange')(); },
    frame(render = true) {
      node('camera').readyState = 2; node('camera').currentTime += .1;
      const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(fn => fn());
      if (render) app.render();
    },
    paint() {
      const pending = [...paintCallbacks.values()];
      paintCallbacks.clear();
      pending.forEach(fn => fn(time));
    },
    direction({ heading = app.session.snapshot(time).guidance?.bearingDegrees ?? 180, beta = 90, gamma = 0, accuracy = 5, ...rest } = {}, render = true) {
      if(!windowListeners.has('deviceorientation'))return;
      const id=app.session.snapshot(time).nearField?.id;
      const emit=value=>{for(const fn of windowListeners.get('deviceorientation')||[])fn({ type:'deviceorientation',alpha:(180-value+360)%360,beta,gamma,
        webkitCompassHeading:value,webkitCompassAccuracy:accuracy,...rest });};
      if(id&&id!==calibratedNearId){calibratedNearId=id;emit(0);}
      emit(heading);if(render)app.render();
    },
    aimAtTreasure() {
      for (let i = 0; i < 5; i++) { if (i) h.advance(450); h.frame(); h.direction(); }
      app.render();
    },
    unlock() {
      h.click('start-location'); h.fix(); h.click('place');
      h.advance(1000); h.fix({ north: 65 }); h.advance(1000); h.fix(); h.advance(2000); h.fix();
    } };
  return h;
}

export function cameraStream() {
  let stops = 0, ended;
  const track = { stop() { stops++; }, getSettings() { return { width: 1280, height: 720, facingMode: 'environment' }; },
    addEventListener(name, fn) { if (name === 'ended') ended = fn; } };
  return { get stops() { return stops; }, end() { ended(); }, getTracks: () => [track], getVideoTracks: () => [track] };
}
