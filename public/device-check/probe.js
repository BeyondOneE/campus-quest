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
  const reasons = { NotAllowedError: '未获授权。请检查 Safari 网站权限，然后重新开启。', NotFoundError: '没有找到可用相机。', NotReadableError: '相机暂不可用，请关闭占用相机的其他应用后重试。', OverconstrainedError: '相机不支持当前参数。', SecurityError: '当前环境禁止访问，请使用 HTTPS 并检查网站权限。', AbortError: '访问被中断，请重试。' };
  return reasons[error?.name] || `${error?.name || 'Error'}：${error?.message || '无法访问设备'}`;
}
function secure() {
  if (window.isSecureContext) return true;
  $('context-note').textContent = '请在手机 Safari 打开受信任的 HTTPS 链接。普通局域网 HTTP 只能预览界面。';
  return false;
}
status('context-badge', window.isSecureContext ? '安全上下文 ✓' : '需要 HTTPS');
if (!window.isSecureContext) $('context-badge').classList.add('blocked');
$('target-badge').textContent = isTarget ? 'iPhone Safari 特征 · 请确认浏览器' : '当前为其他或未确认环境 · 仅作辅助检查';
$('context-note').textContent = window.isSecureContext ? '相机、运动、定位分别授权；页面不会自动申请权限。' : '普通局域网 HTTP 只能预览界面，请使用受信任的 HTTPS 链接测试硬件。';

function cancelFrameCallback() {
  if (frameCallback !== null && typeof video.cancelVideoFrameCallback === 'function') video.cancelVideoFrameCallback(frameCallback);
  frameCallback = null;
}
function stopCamera(reason = '已停止') {
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
  if (!navigator.mediaDevices?.getUserMedia) { status('camera-status', '接口不可用', 'bad'); return; }
  stopCamera();
  const token = cameraToken; cameraPending = true;
  state.camera = { permission: 'requesting', frames: 0, firstFrameAt: null, lastFrameAt: null, settings: null, error: null, ended: false };
  $('start-camera').disabled = true; $('stop-camera').disabled = false;
  status('camera-status', '等待授权', 'warn'); $('camera-detail').textContent = '请在 Safari 提示中允许使用相机';
  try {
    const acquired = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    if (token !== cameraToken || document.hidden) { acquired.getTracks().forEach(track => track.stop()); return; }
    cameraPending = false; stream = acquired; state.camera.permission = 'granted';
    const track = stream.getVideoTracks()[0]; const settings = track.getSettings();
    state.camera.settings = { width: settings.width, height: settings.height, facingMode: settings.facingMode || 'not-reported', frameRate: settings.frameRate };
    track.addEventListener('ended', () => { if (stream === acquired) { state.camera.ended = true; stopCamera('采集中断'); log('camera-track-ended'); } });
    video.srcObject = stream; lastVideoTime = -1;
    requestFrame(token);
    try { await video.play(); } catch {
      if (token !== cameraToken) return;
      $('retry-playback').hidden = false; status('camera-status', '点击恢复播放', 'warn');
    }
    if (token !== cameraToken) return;
    log('camera-started');
  } catch (error) {
    if (token !== cameraToken) return;
    stopCamera(); state.camera.permission = error.name === 'NotAllowedError' ? 'denied' : 'error';
    state.camera.error = error.name; status('camera-status', '未开启', 'bad'); $('camera-detail').textContent = message(error); log(`camera-error:${error.name}`);
  }
}
$('start-camera').addEventListener('click', startCamera);
$('stop-camera').addEventListener('click', () => { stopCamera(); $('camera-detail').textContent = '相机已释放，可重新开启'; log('camera-stopped'); });
$('retry-playback').addEventListener('click', async () => {
  try { await video.play(); $('retry-playback').hidden = true; } catch { $('camera-detail').textContent = '播放仍被阻止，请停止后重新开启相机'; }
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
function stopSensors(reason = '已停止') {
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
  $('start-sensors').disabled = true; status('sensor-status', '等待授权', 'warn');
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
  $('sensor-detail').textContent = '请缓慢转动手机；授权成功后仍需确认收到有效姿态和旋转速率。';
  log(`sensors-started:${state.orientation.permission}/${state.motion.permission}`);
  render();
}
$('start-sensors').addEventListener('click', startSensors);
$('calibrate').addEventListener('click', () => {
  if (channelHealth(state.orientation, performance.now()) !== 'live' || !state.latestOrientation) return;
  const { alpha, beta, gamma } = state.latestOrientation; state.calibration = { alpha, beta, gamma };
  $('sensor-detail').textContent = '已将当前视角设为参考方向，缓慢转动手机观察线索。'; log('relative-view-calibrated');
});

function stopLocation(reason = '已停止') {
  locationToken += 1;
  if (locationWatch !== null) navigator.geolocation?.clearWatch(locationWatch);
  locationWatch = null; $('start-location').disabled = false; $('stop-location').disabled = true;
  status('location-status', reason);
}
$('start-location').addEventListener('click', () => {
  if (!secure()) return;
  if (!navigator.geolocation) { status('location-status', '接口不可用', 'bad'); return; }
  stopLocation(); const token = locationToken;
  state.location = null; state.locationStatus = 'requesting'; state.locationError = null; state.locationSamples = 0;
  $('latitude').textContent = '—'; $('longitude').textContent = '—'; $('accuracy').textContent = '—';
  $('start-location').disabled = true; $('stop-location').disabled = false;
  $('location-detail').textContent = '等待系统定位，请保持页面在前台'; status('location-status', '等待定位', 'warn');
  locationWatch = navigator.geolocation.watchPosition(position => {
    if (token !== locationToken || document.hidden) return;
    const { latitude, longitude, accuracy } = position.coords;
    if (![latitude, longitude, accuracy].every(finite)) return;
    state.locationStatus = 'received'; state.locationError = null; state.locationSamples += 1;
    state.location = { latitude, longitude, accuracyMeters: accuracy, timestamp: new Date(position.timestamp).toISOString() };
    $('latitude').textContent = latitude.toFixed(6); $('longitude').textContent = longitude.toFixed(6); $('accuracy').textContent = `±${Math.round(accuracy)}m`;
    $('location-detail').textContent = `已收到 ${state.locationSamples} 次位置更新 · 精度由系统报告`;
    status('location-status', '收到位置', 'good');
  }, error => {
    if (token !== locationToken) return;
    state.locationError = error.code; state.locationStatus = 'error';
    const descriptions = { 1: '定位未获授权，请检查网站和系统定位权限后重试。', 2: '暂时无法获取位置，请到开阔处重试。', 3: '定位等待超时，尚未获得有效位置。可以稍后重试。' };
    $('location-detail').textContent = descriptions[error.code] || '定位失败，请重试';
    status('location-status', '定位未完成', 'warn');
    if (error.code === 1) { stopLocation('未获授权'); status('location-status', '未获授权', 'bad'); }
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
    status('camera-status', live ? '画面更新中' : '等待画面', live ? 'good' : 'warn');
    if (!$('retry-playback').hidden) status('camera-status', '点击恢复播放', 'warn');
    const settings = state.camera.settings;
    $('camera-detail').textContent = `${settings?.width || video.videoWidth || '—'} × ${settings?.height || video.videoHeight || '—'} · 镜头 ${settings?.facingMode || '未报告'} · 已观察 ${state.camera.frames} 次画面更新`;
  }
  const orientationHealth = channelHealth(state.orientation, now), motionHealth = channelHealth(state.motion, now);
  if (state.orientation.running || state.motion.running) {
    const both = orientationHealth === 'live' && motionHealth === 'live';
    status('sensor-status', both ? '姿态与运动有效' : orientationHealth === 'live' ? '仅姿态有效' : motionHealth === 'live' ? '仅旋转速率有效' : '等待有效数据', both ? 'good' : 'warn');
  } else if (['denied','error','unsupported'].includes(state.orientation.permission) || ['denied','error','unsupported'].includes(state.motion.permission)) {
    status('sensor-status', '未获权限或不支持', 'bad');
    $('sensor-detail').textContent = `姿态：${state.orientation.permission}；运动：${state.motion.permission}。可检查 Safari 网站设置后重试。`;
  }
  $('orientation-rate').textContent = `${frequency(state.orientation.timestamps, now).toFixed(1)} Hz · ${state.orientation.validCount} 次有效 · ${state.orientation.running ? (orientationHealth === 'stale' ? '数据中断' : orientationHealth === 'waiting' ? '等待数据' : '采集中') : '已停止'}`;
  $('motion-rate').textContent = `${frequency(state.motion.timestamps, now).toFixed(1)} Hz · ${state.motion.validCount} 次有效 · ${state.motion.running ? (motionHealth === 'stale' ? '数据中断' : motionHealth === 'waiting' ? '等待数据' : '采集中') : '已停止'}`;
  const orientation = state.latestOrientation;
  if (orientation) {
    for (const key of ['alpha','beta','gamma']) $(key).textContent = degrees(orientation[key]);
    $('heading').textContent = finite(orientation.compassHeading) ? `${degrees(orientation.compassHeading)} · 精度 ${degrees(orientation.compassAccuracy)}` : '未提供有效指南针数据';
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
function stopAll(reason = '已停止') { stopCamera(reason); stopSensors(reason); stopLocation(reason); state.locationStatus = state.location ? 'stopped' : state.locationStatus; }
$('stop-all').addEventListener('click', () => { stopAll(); log('all-stopped'); render(); });
function pauseForBackground() {
  if (document.hidden) {
    state.backgroundVisits += 1; stopAll('后台已停止'); log('background:hardware-stopped');
    clearInterval(renderTimer); renderTimer = null;
    $('lifecycle').textContent = `已离开前台 ${state.backgroundVisits} 次。硬件已停止，返回后请重新开启。`;
  } else { if (renderTimer === null) renderTimer = setInterval(render, 500); render(); log('foreground:manual-restart-required'); }
}
document.addEventListener('visibilitychange', pauseForBackground);
window.addEventListener('pagehide', () => { stopAll('页面离开已停止'); clearInterval(renderTimer); renderTimer = null; });
window.addEventListener('pageshow', () => { if (renderTimer === null && !document.hidden) renderTimer = setInterval(render, 500); });
window.addEventListener('orientationchange', () => { state.calibration = null; $('sensor-detail').textContent = '屏幕方向已改变，请保持姿态稳定并重新校准。'; log('screen-orientation-changed'); });
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
  $('export-status').textContent = '报告已生成，请查看 Safari 下载项；如打开预览，可使用分享菜单存到“文件”。报告不会自动发送。';
});
renderTimer = setInterval(render, 500);
log('page-opened'); render();
