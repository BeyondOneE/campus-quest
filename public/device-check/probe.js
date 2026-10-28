import { finite, angleDelta, frequency, channelHealth, summary, locationForReport, isIPhoneSafariCandidate } from './measurements.js';

const $ = id => document.getElementById(id);
const createdAt = new Date().toISOString();
const channel = () => ({ permission: 'not-requested', running: false, events: 0, validCount: 0, lastAt: null, timestamps: [] });
const state = {
  camera: { permission: 'not-requested', frames: 0, firstFrameAt: null, lastFrameAt: null, settings: null, error: null, ended: false },
  orientation: channel(), motion: channel(), latestOrientation: null, latestRotation: null,
  location: null, locationStatus: 'not-requested', locationSamples: 0, locationError: null,
  calibration: null, backgroundVisits: 0, events: [],
};
let stream = null, cameraToken = 0, sensorToken = 0, cameraPending = false;
let locationWatch = null, locationToken = 0, frameCallback = null, lastVideoTime = -1;
let renderTimer = null;
const video = $('camera');
const isTarget = isIPhoneSafariCandidate(navigator.userAgent);
function log(event) { state.events.push({ at: new Date().toISOString(), event }); if (state.events.length > 80) state.events.shift(); }
function status(id, text, tone = '') { $(id).textContent = text; $(id).dataset.tone = tone; }
function degrees(value) { return finite(value) ? `${value.toFixed(1)}°` : '—'; }
function message(error) {
  const reasons = { NotAllowedError: 'Permission denied. Check Safari website permissions and try again.', NotFoundError: 'No camera was found.', NotReadableError: 'Camera unavailable. Close other camera apps and try again.', OverconstrainedError: 'The camera does not support these settings.', SecurityError: 'Access blocked. Use HTTPS and check website permissions.', AbortError: 'Access was interrupted. Please try again.' };
  return reasons[error?.name] || `${error?.name || 'Error'}：${error?.message || 'Unable to access this device'}`;
}
function secure() {
  if (window.isSecureContext) return true;
  $('context-note').textContent = 'Open a trusted HTTPS link in iPhone Safari to enable device access.';
  return false;
}
status('context-badge', window.isSecureContext ? 'Secure connection ✓' : 'HTTPS required');
if (!window.isSecureContext) $('context-badge').classList.add('blocked');
$('target-badge').textContent = isTarget ? 'iPhone Safari candidate' : 'Browser compatibility preview';
$('context-note').textContent = window.isSecureContext ? 'Live device data · Each feature starts with your permission.' : 'Use a trusted HTTPS link to enable camera, motion and location.';

function cancelFrameCallback() {
  if (frameCallback !== null && typeof video.cancelVideoFrameCallback === 'function') video.cancelVideoFrameCallback(frameCallback);
  frameCallback = null;
}
function stopCamera(reason = 'Stopped') {
  cameraToken += 1; cameraPending = false;
  cancelFrameCallback();
  const previous = stream; stream = null;
  previous?.getTracks().forEach(track => track.stop());
  video.pause(); video.srcObject = null;
  $('camera-placeholder').hidden = false; $('artifact').hidden = true;
  $('start-camera').disabled = false; $('stop-camera').disabled = true; $('retry-playback').hidden = true;
  status('camera-status', reason);
}
function frameArrived() {
  if (!stream || document.hidden) return;
  const now = performance.now(); state.camera.frames += 1;
  state.camera.lastFrameAt = now; state.camera.firstFrameAt ??= now;
  $('camera-placeholder').hidden = true;
}
function requestFrame(token) {
  if (typeof video.requestVideoFrameCallback !== 'function') return;
  frameCallback = video.requestVideoFrameCallback(() => {
    if (token !== cameraToken || !stream) return;
    frameArrived(); requestFrame(token);
  });
}
async function startCamera() {
  if (!secure()) return;
  if (!navigator.mediaDevices?.getUserMedia) { status('camera-status', 'API unavailable', 'bad'); return; }
  stopCamera();
  const token = cameraToken; cameraPending = true;
  state.camera = { permission: 'requesting', frames: 0, firstFrameAt: null, lastFrameAt: null, settings: null, error: null, ended: false };
  $('start-camera').disabled = true; $('stop-camera').disabled = false;
  status('camera-status', 'Awaiting permission', 'warn'); $('camera-detail').textContent = 'Allow camera access in the browser prompt.';
  try {
    const acquired = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    if (token !== cameraToken || document.hidden) { acquired.getTracks().forEach(track => track.stop()); return; }
    cameraPending = false; stream = acquired; state.camera.permission = 'granted';
    const track = stream.getVideoTracks()[0]; const settings = track.getSettings();
    state.camera.settings = { width: settings.width, height: settings.height, facingMode: settings.facingMode || 'not-reported', frameRate: settings.frameRate };
    track.addEventListener('ended', () => { if (stream === acquired) { state.camera.ended = true; stopCamera('Capture interrupted'); log('camera-track-ended'); } });
    video.srcObject = stream; lastVideoTime = -1;
    requestFrame(token);
    try { await video.play(); } catch {
      if (token !== cameraToken) return;
      $('retry-playback').hidden = false; status('camera-status', 'Tap to resume', 'warn');
    }
    if (token !== cameraToken) return;
    log('camera-started');
  } catch (error) {
    if (token !== cameraToken) return;
    stopCamera(); state.camera.permission = error.name === 'NotAllowedError' ? 'denied' : 'error';
    state.camera.error = error.name; status('camera-status', 'Not enabled', 'bad'); $('camera-detail').textContent = message(error); log(`camera-error:${error.name}`);
  }
}
$('start-camera').addEventListener('click', startCamera);
$('stop-camera').addEventListener('click', () => { stopCamera(); $('camera-detail').textContent = 'Camera released. You can start it again.'; log('camera-stopped'); });
$('retry-playback').addEventListener('click', async () => {
  try { await video.play(); $('retry-playback').hidden = true; } catch { $('camera-detail').textContent = 'Playback blocked. Stop and restart the camera.'; }
});

function sample(target, now) { target.validCount += 1; target.lastAt = now; target.timestamps.push(now); }
function onOrientation(event) {
  const target = state.orientation; if (!target.running) return;
  target.events += 1;
  if (![event.alpha, event.beta, event.gamma].every(finite)) return;
  sample(target, performance.now());
  state.latestOrientation = { alpha: event.alpha, beta: event.beta, gamma: event.gamma, absolute: event.absolute === true,
    compassHeading: finite(event.webkitCompassHeading) && event.webkitCompassHeading >= 0 && (!finite(event.webkitCompassAccuracy) || event.webkitCompassAccuracy >= 0) ? event.webkitCompassHeading : null,
    compassAccuracy: finite(event.webkitCompassAccuracy) ? event.webkitCompassAccuracy : null };
  if (!state.calibration) state.calibration = { alpha: event.alpha, beta: event.beta, gamma: event.gamma };
}
function onMotion(event) {
  const target = state.motion; if (!target.running) return;
  target.events += 1;
  const rotation = event.rotationRate;
  if (!rotation || ![rotation.alpha, rotation.beta, rotation.gamma].some(finite)) return;
  sample(target, performance.now());
  state.latestRotation = { alpha: finite(rotation.alpha) ? rotation.alpha : null, beta: finite(rotation.beta) ? rotation.beta : null, gamma: finite(rotation.gamma) ? rotation.gamma : null };
}
function stopSensors(reason = 'Stopped') {
  sensorToken += 1;
  window.removeEventListener('deviceorientation', onOrientation); window.removeEventListener('devicemotion', onMotion);
  state.orientation.running = false; state.motion.running = false;
  $('start-sensors').disabled = false; $('calibrate').disabled = true; $('artifact').hidden = true;
  status('sensor-status', reason);
}
async function startSensors() {
  if (!secure()) return;
  stopSensors(); const token = sensorToken;
  state.orientation = channel(); state.motion = channel(); state.latestOrientation = null; state.latestRotation = null; state.calibration = null;
  $('start-sensors').disabled = true; status('sensor-status', 'Awaiting permission', 'warn');
  // Both permission requests must begin synchronously inside this click handler.
  const definitions = [['orientation', window.DeviceOrientationEvent, 'deviceorientation', onOrientation], ['motion', window.DeviceMotionEvent, 'devicemotion', onMotion]];
  const requests = definitions.map(([key, Constructor]) => {
    if (!Constructor) return Promise.resolve('unsupported');
    state[key].permission = 'requesting';
    try { return typeof Constructor.requestPermission === 'function' ? Constructor.requestPermission() : Promise.resolve('not-required'); }
    catch (error) { return Promise.reject(error); }
  });
  const outcomes = await Promise.allSettled(requests);
  if (token !== sensorToken || document.hidden) return;
  outcomes.forEach((result, index) => {
    const [key, , name, handler] = definitions[index];
    const permission = result.status === 'fulfilled' ? result.value : 'error';
    state[key].permission = permission;
    if (permission === 'granted' || permission === 'not-required') { state[key].running = true; window.addEventListener(name, handler); }
  });
  $('start-sensors').disabled = false;
  $('sensor-detail').textContent = 'Gently rotate your phone to receive live orientation and rotation data.';
  log(`sensors-started:${state.orientation.permission}/${state.motion.permission}`);
  render();
}
$('start-sensors').addEventListener('click', startSensors);
$('calibrate').addEventListener('click', () => {
  if (channelHealth(state.orientation, performance.now()) !== 'live' || !state.latestOrientation) return;
  const { alpha, beta, gamma } = state.latestOrientation; state.calibration = { alpha, beta, gamma };
  $('sensor-detail').textContent = 'View calibrated. Turn your phone to explore the relative clue overlay.'; log('relative-view-calibrated');
});

function stopLocation(reason = 'Stopped') {
  locationToken += 1;
  if (locationWatch !== null) navigator.geolocation?.clearWatch(locationWatch);
  locationWatch = null; $('start-location').disabled = false; $('stop-location').disabled = true;
  status('location-status', reason);
}
$('start-location').addEventListener('click', () => {
  if (!secure()) return;
  if (!navigator.geolocation) { status('location-status', 'API unavailable', 'bad'); return; }
  stopLocation(); const token = locationToken;
  state.location = null; state.locationStatus = 'requesting'; state.locationError = null; state.locationSamples = 0;
  $('latitude').textContent = '—'; $('longitude').textContent = '—'; $('accuracy').textContent = '—';
  $('start-location').disabled = true; $('stop-location').disabled = false;
  $('location-detail').textContent = 'Acquiring your position. Keep this page in the foreground.'; status('location-status', 'Acquiring location', 'warn');
  locationWatch = navigator.geolocation.watchPosition(position => {
    if (token !== locationToken || document.hidden) return;
    const { latitude, longitude, accuracy } = position.coords;
    if (![latitude, longitude, accuracy].every(finite)) return;
    state.locationStatus = 'received'; state.locationError = null; state.locationSamples += 1;
    state.location = { latitude, longitude, accuracyMeters: accuracy, timestamp: new Date(position.timestamp).toISOString() };
    $('latitude').textContent = latitude.toFixed(6); $('longitude').textContent = longitude.toFixed(6); $('accuracy').textContent = `±${Math.round(accuracy)}m`;
    $('location-detail').textContent = `${state.locationSamples} position updates · Accuracy reported by the system`;
    status('location-status', 'Location received', 'good');
  }, error => {
    if (token !== locationToken) return;
    state.locationError = error.code; state.locationStatus = 'error';
    const descriptions = { 1: 'Location denied. Check website and system permissions, then retry.', 2: 'Position unavailable. Try an open outdoor space.', 3: 'Location timed out. Please try again.' };
    $('location-detail').textContent = descriptions[error.code] || 'Location failed. Please retry.';
    status('location-status', 'Location pending', 'warn');
    if (error.code === 1) { stopLocation('Permission denied'); status('location-status', 'Permission denied', 'bad'); }
    log(`location-error:${error.code}`);
  }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  log('location-started');
});
$('stop-location').addEventListener('click', () => { stopLocation(); state.locationStatus = 'stopped'; log('location-stopped'); });

function render() {
  const now = performance.now();
  for (const key of ['orientation', 'motion']) state[key].timestamps = state[key].timestamps.filter(t => now - t <= 2000);
  if (stream) {
    if (typeof video.requestVideoFrameCallback !== 'function' && video.readyState >= 2 && video.currentTime > lastVideoTime) { lastVideoTime = video.currentTime; frameArrived(); }
    const live = state.camera.frames > 0 && now - state.camera.lastFrameAt < 2500 && !video.paused;
    status('camera-status', live ? 'Live camera' : 'Waiting for video', live ? 'good' : 'warn');
    if (!$('retry-playback').hidden) status('camera-status', 'Tap to resume', 'warn');
    const settings = state.camera.settings;
    $('camera-detail').textContent = `${settings?.width || video.videoWidth || '—'} × ${settings?.height || video.videoHeight || '—'} · Lens: ${settings?.facingMode || 'not reported'} · ${state.camera.frames} frame updates`;
  }
  const orientationHealth = channelHealth(state.orientation, now), motionHealth = channelHealth(state.motion, now);
  if (state.orientation.running || state.motion.running) {
    const both = orientationHealth === 'live' && motionHealth === 'live';
    status('sensor-status', both ? 'Motion & orientation live' : orientationHealth === 'live' ? 'Orientation live' : motionHealth === 'live' ? 'Rotation rate live' : 'Waiting for valid data', both ? 'good' : 'warn');
  } else if (['denied','error','unsupported'].includes(state.orientation.permission) || ['denied','error','unsupported'].includes(state.motion.permission)) {
    status('sensor-status', 'Denied or unsupported', 'bad');
    $('sensor-detail').textContent = `Orientation: ${state.orientation.permission}; motion: ${state.motion.permission}. Check browser permissions to retry.`;
  }
  $('orientation-rate').textContent = `${frequency(state.orientation.timestamps, now).toFixed(1)} Hz · ${state.orientation.validCount} valid samples · ${state.orientation.running ? (orientationHealth === 'stale' ? 'Data paused' : orientationHealth === 'waiting' ? 'Awaiting data' : 'Receiving') : 'Stopped'}`;
  $('motion-rate').textContent = `${frequency(state.motion.timestamps, now).toFixed(1)} Hz · ${state.motion.validCount} valid samples · ${state.motion.running ? (motionHealth === 'stale' ? 'Data paused' : motionHealth === 'waiting' ? 'Awaiting data' : 'Receiving') : 'Stopped'}`;
  const orientation = state.latestOrientation;
  if (orientation) {
    for (const key of ['alpha','beta','gamma']) $(key).textContent = degrees(orientation[key]);
    $('heading').textContent = finite(orientation.compassHeading) ? `${degrees(orientation.compassHeading)} · accuracy ${degrees(orientation.compassAccuracy)}` : 'No valid compass heading';
  }
  const rotation = state.latestRotation;
  if (rotation) $('rotation').textContent = `α ${degrees(rotation.alpha)}/s · β ${degrees(rotation.beta)}/s · γ ${degrees(rotation.gamma)}/s`;
  $('calibrate').disabled = !state.orientation.running || orientationHealth !== 'live';
  const showArtifact = Boolean(stream && orientationHealth === 'live' && state.orientation.running && state.calibration && state.camera.frames > 0 && now - state.camera.lastFrameAt < 2500);
  $('artifact').hidden = !showArtifact;
  if (showArtifact) {
    const x = Math.max(-110, Math.min(110, -angleDelta(orientation.alpha, state.calibration.alpha) * 3));
    const y = Math.max(-70, Math.min(70, angleDelta(orientation.beta, state.calibration.beta) * 2));
    $('artifact').style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }
}
function stopAll(reason = 'Stopped') { stopCamera(reason); stopSensors(reason); stopLocation(reason); state.locationStatus = state.location ? 'stopped' : state.locationStatus; }
$('stop-all').addEventListener('click', () => { stopAll(); log('all-stopped'); render(); });
function pauseForBackground() {
  if (document.hidden) {
    state.backgroundVisits += 1; stopAll('Paused in background'); log('background:hardware-stopped');
    clearInterval(renderTimer); renderTimer = null;
    $('lifecycle').textContent = `Background visits: ${state.backgroundVisits}. Capture stopped. Tap to restart when you return.`;
  } else { if (renderTimer === null) renderTimer = setInterval(render, 500); render(); log('foreground:manual-restart-required'); }
}
document.addEventListener('visibilitychange', pauseForBackground);
window.addEventListener('pagehide', () => { stopAll('Stopped on page exit'); clearInterval(renderTimer); renderTimer = null; });
window.addEventListener('pageshow', () => { if (renderTimer === null && !document.hidden) renderTimer = setInterval(render, 500); });
window.addEventListener('orientationchange', () => { state.calibration = null; $('sensor-detail').textContent = 'Screen orientation changed. Hold steady and recalibrate.'; log('screen-orientation-changed'); });
$('download-report').addEventListener('click', () => {
  const now = performance.now();
  const report = {
    schemaVersion: 1, createdAt, exportedAt: new Date().toISOString(), target: 'iPhone Safari',
    environment: { userAgent: navigator.userAgent, secureContext: window.isSecureContext, targetBrowserDetected: isTarget, browserIdentification: 'user-agent-heuristic-only', viewport: { width: window.innerWidth, height: window.innerHeight }, visibility: document.visibilityState },
    camera: { ...state.camera, running: Boolean(stream), pending: cameraPending, firstFrameAt: undefined, lastFrameAt: undefined, lastFrameAgeMs: state.camera.lastFrameAt === null ? null : Math.round(now - state.camera.lastFrameAt), observation: state.camera.frames > 0 ? 'frames-observed' : 'no-frames-observed' },
    orientation: { ...summary(state.orientation, now), latest: state.latestOrientation }, motion: { ...summary(state.motion, now), latestRotationRate: state.latestRotation },
    location: { status: state.locationStatus, running: locationWatch !== null, receivedSamples: state.locationSamples, errorCode: state.locationError, includesCoordinates: $('include-location').checked, lastReading: locationForReport(state.location, $('include-location').checked) },
    manualChecks: { rearCameraSmooth: $('check-camera').checked, relativeClueResponds: $('check-motion').checked, locationAcceptable: $('check-location').checked, restartAfterBackgroundWorks: $('check-resume').checked },
    notes: $('notes').value, backgroundVisits: state.backgroundVisits, events: state.events,
    limitations: ['Camera and motion access do not establish spatial AR tracking.', 'Orientation is relative unless explicitly reported otherwise.', 'Location accuracy is provider-reported, not a measured error.', 'A desktop run does not validate iPhone hardware.', 'User-agent detection is a heuristic and does not prove the browser app is Safari.'],
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `campus-quest-safari-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  $('export-status').textContent = 'Report generated. Check browser downloads or use Share to save it to Files. Nothing is sent automatically.';
});
renderTimer = setInterval(render, 500);
log('page-opened'); render();

// Temporary classroom capture layout; changing tabs never restarts hardware.
const captureTabs = document.querySelectorAll?.('[data-view]') ?? [];
for (const tab of captureTabs) tab.addEventListener('click', () => {
  document.body.dataset.capture = tab.dataset.view;
  for (const item of captureTabs) item.classList.toggle('active', item === tab);
  window.scrollTo(0, 0);
});
