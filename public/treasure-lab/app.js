import { DEFAULT_ROOM_MODE, INDOOR_DEFAULTS, isIndoorMode } from './indoor.js';
import { IndoorRonin } from './ronin.js';
import { mountGuide } from './guide.js';
import { mountTutorials } from './tutorials.js';
import { RemoteTreasureSession } from './client.js';
import { normalizeRoomCode } from './model.js';
import { AR_DEFAULTS, AimHold, LocalSearchPose, angleDelta, cameraPose, floorHeading, projectTreasure } from './ar.js';

const modeChoices = [
  ['gps', 'mode-gps', 'Outdoor'],
  ['indoor-ronin', 'mode-ronin', 'Indoor'],
];
const radarRange = 5;
const chestArt = cardId => cardId ? `#chest-${cardId}` : '#chest';

// Motion only decorates. State, text and [hidden] always change synchronously first, and
// every effect here does nothing when the browser lacks it or asks for reduced motion.
function createMotion({ document, window, canvas }) {
  const calm = !window.requestAnimationFrame || !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noop = () => {};
  if (calm) return { calm, ghost: noop, pulse: noop, swapIn: noop, flip: noop, burst: noop, flash: noop, ambient: noop, count: (el, value) => { el.textContent = value === null ? '—' : `${value} m`; } };
  const ctx = canvas.getContext?.('2d'), particles = [], gold = ['#fff3bf', '#ffd262', '#f8c64f', '#ffb84a'];
  const places = new Map();
  let width = 0, height = 0, ratio = 1, frame = 0, mode = 'dust', tick = 0, target = null, shown = null, tween = 0;
  const resize = () => {
    ratio = Math.min(window.devicePixelRatio || 1, 2); width = canvas.clientWidth; height = canvas.clientHeight;
    canvas.width = width * ratio; canvas.height = height * ratio;
  };
  const between = (low, high) => low + Math.random() * (high - low);
  function spawnAmbient() {
    if (mode === 'dust' && particles.filter(p => p.kind === 'dust').length < 8 && Math.random() < .05) {
      particles.push({ kind: 'dust', x: between(0, width), y: between(height * .35, height), vx: between(-6, 6), vy: between(-22, -8), size: between(.6, 1.4), age: 0, life: between(4, 9), phase: between(0, 6) });
    }
    if (mode === 'sparkle' && Math.random() < .08) {
      const angle = between(0, 6.28), reach = between(50, Math.min(width, 460) * .42);
      particles.push({ kind: 'spark', x: width / 2 + Math.cos(angle) * reach, y: height * .47 + Math.sin(angle) * reach * .8, vx: 0, vy: between(-30, -8), size: between(3, 8), age: 0, life: between(.6, 1.2), phase: 0 });
    }
  }
  function draw(p, t) {
    const fade = Math.min(1, t * 5) * Math.min(1, (1 - t) * 3);
    ctx.globalAlpha = fade;
    if (p.kind === 'coin') {
      p.spin += .22;
      ctx.fillStyle = Math.cos(p.spin) > 0 ? '#ffd262' : '#c98a1f';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * Math.max(.18, Math.abs(Math.cos(p.spin))), p.size, p.tilt, 0, 6.29); ctx.fill();
    } else if (p.kind === 'spark') {
      const r = p.size * (1 - t * .4), w = r * .16;
      ctx.fillStyle = p.color || '#fff6cf';
      ctx.beginPath(); ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x + w, p.y - w); ctx.lineTo(p.x + r, p.y); ctx.lineTo(p.x + w, p.y + w);
      ctx.lineTo(p.x, p.y + r); ctx.lineTo(p.x - w, p.y + w); ctx.lineTo(p.x - r, p.y); ctx.lineTo(p.x - w, p.y - w); ctx.fill();
    } else {
      ctx.globalAlpha = fade * .85; ctx.fillStyle = '#d6f5a4';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.29); ctx.fill();
    }
  }
  let last = 0;
  function loop(time) {
    frame = 0;
    if (document.hidden || !ctx) return;
    const dt = Math.min(.05, (time - last) / 1000 || .016); last = time;
    if (canvas.clientWidth !== width || canvas.clientHeight !== height) resize();
    tick += 1;
    // Quiet moments run at half rate; only a burst earns every frame.
    const busy = particles.some(p => p.kind === 'coin');
    if (busy || tick % 2 === 0) {
      spawnAmbient();
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
      const step = busy ? dt : dt * 2;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.age += step;
        if (p.age >= p.life) { particles.splice(i, 1); continue; }
        p.vy += (p.gravity || 0) * step; p.vx *= p.drag || 1;
        p.x += (p.vx + (p.kind === 'dust' ? Math.sin(p.age + p.phase) * 8 : 0)) * step; p.y += p.vy * step;
        draw(p, p.age / p.life);
      }
      ctx.globalAlpha = 1;
    }
    if (particles.length || mode !== 'none') frame = window.requestAnimationFrame(loop);
    else ctx.clearRect(0, 0, width, height);
  }
  const kick = () => { if (!frame && !document.hidden && ctx) frame = window.requestAnimationFrame(loop); };
  return {
    calm,
    // Leaves a decorative copy animating out while the real element is already hidden.
    ghost(element, keyframes, ms) {
      const copy = element.cloneNode?.(true);
      if (!copy) return;
      copy.removeAttribute('id'); copy.querySelectorAll('[id]').forEach(child => child.removeAttribute('id'));
      copy.querySelectorAll('video').forEach(child => child.remove());
      copy.classList.add('ghost'); copy.setAttribute('aria-hidden', 'true'); copy.setAttribute('inert', '');
      element.before(copy);
      copy.animate(keyframes, { duration: ms, easing: 'cubic-bezier(.4,0,.7,.2)', fill: 'forwards' });
      // A timer, not onfinish: animations stall in a throttled page and a copy must never linger.
      window.setTimeout(() => copy.remove(), ms + 40);
    },
    pulse(element, amount = 1.08) {
      element.animate?.([{ transform: 'scale(1)' }, { transform: `scale(${amount})` }, { transform: 'scale(1)' }], { duration: 560, easing: 'cubic-bezier(.2,1.25,.35,1)' });
    },
    swapIn(element) {
      element.animate?.([{ opacity: 0, transform: 'translateY(9px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,.8,.24,1)' });
    },
    // When the layout settles somewhere new, glide there instead of jumping.
    flip(elements) {
      for (const element of elements) {
        if (typeof element.offsetTop !== 'number') continue;
        const was = places.get(element), now = element.offsetWidth ? { x: element.offsetLeft, y: element.offsetTop, w: element.offsetWidth } : null;
        places.set(element, now);
        if (!was || !now) continue;
        const dy = was.y - now.y, dx = was.x - now.x, scale = was.w / now.w;
        if (Math.abs(dy) < 2 && Math.abs(dx) < 2 && Math.abs(scale - 1) < .01) continue;
        element.animate?.([{ transform: `translate(${dx}px,${dy}px) scale(${scale})` }, { transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.22,.8,.24,1)' });
      }
    },
    forgetPlaces() { places.clear(); },
    burst(element, size = 1) {
      const box = element.getBoundingClientRect?.();
      if (!box || !box.width || !ctx) return;
      if (!width) resize();
      const x = box.left + box.width / 2, y = box.top + box.height * .45;
      for (let i = 0; i < 46 * size; i++) {
        const angle = between(-3.05, -.09), speed = between(160, 560) * Math.sqrt(size), coin = i % 2 === 0;
        particles.push({ kind: coin ? 'coin' : 'spark', x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, gravity: 720, drag: .992,
          size: coin ? between(4, 8) : between(4, 11), spin: between(0, 6), tilt: between(-.5, .5), age: 0, life: between(1.1, 2.1), color: gold[i % 4] });
      }
      kick();
    },
    flash(element) {
      element.animate?.([{ opacity: 0 }, { opacity: .95, offset: .16 }, { opacity: 0 }], { duration: 760, easing: 'ease-out' });
    },
    ambient(next) { mode = next; if (mode !== 'none') kick(); },
    // Distance rolls to each new reading rather than snapping.
    count(element, value) {
      if (value === null) { window.cancelAnimationFrame(tween); tween = 0; target = shown = null; element.textContent = '—'; return; }
      if (value === target) return;
      target = value;
      const from = shown ?? value, start = window.performance?.now?.() ?? 0;
      window.cancelAnimationFrame(tween);
      const roll = time => {
        const t = Math.min(1, Math.max(0, (time - start) / 500)), eased = 1 - (1 - t) ** 3;
        shown = Math.round(from + (value - from) * eased); element.textContent = `${shown} m`;
        tween = t < 1 ? window.requestAnimationFrame(roll) : 0;
      };
      if (from === value || document.hidden) { shown = value; element.textContent = `${value} m`; }
      else tween = window.requestAnimationFrame(roll);
    },
  };
}

export function mountTreasureLab({ document, window, navigator, now = () => Date.now(), session = new RemoteTreasureSession({ now }) }) {
  const $ = id => document.getElementById(id);
  const motion = createMotion({ document, window, canvas: $('fx') });
  let createdAt = new Date(now()).toISOString();
  const defaultRadius = $('radius').value, defaultReportStatus = $('report-status').textContent;
  const video = $('camera'), cameraScreen = $('screen-camera'), chest = $('treasure');
  const guide = mountGuide({ document, session, window, now, onToggle: () => render(), onTutorial: id => tutorials.start(id, { fromGuide: true }) });
  const tutorials = mountTutorials({ document, window, onChange: () => render(), onReturnToGuide: guide.resumeAfterTutorial });
  let watch = null, locationToken = 0, stream = null, cameraToken = 0, frameCallback = null, cameraPaint = null;
  let cameraPending = false, cameraError = null, cameraSettings = null;
  let frames = 0, lastFrameAt = null, lastVideoTime = -1, timer = null;
  let locationError = '', cameraMessage = '', cameraNotice = '', cameraFailure = '', nextPoll = 0, collecting = false;
  let claimError = '', entryError = '';
  let rewardNotice = null;
  // Which screen is showing follows session state; these only track what the player has opened.
  let booted = !session.connect, entryMode = 'home', placing = false, sheet = '', sheetOpener = null;
  let pendingMode = null, modeChanging = false, modeError = '';
  let roomExitTarget = null, roomExitError = '';
  let progressTab = 'leaderboard', progressLoaded = false, progressRequest = 0;
  const roomExitActions = {
    leave: { title: 'Leave this room?', button: 'Leave room', pending: 'Leaving room…',
      menu: 'menu', opener: 'leave-room', run: target => session.leaveRoom(target) },
    logout: { title: 'Sign out and leave?', button: 'Sign out', pending: 'Signing out…',
      menu: 'menu', opener: 'logout', run: target => session.logout(target) },
    reset: { title: 'Reset this demo?', button: 'Clear room and go to start', pending: 'Resetting demo…',
      menu: 'tools', opener: 'open-reset', run: target => session.resetDemo(target) },
  };
  let playersKey = '', shownScreen = '', shownRound = null;
  let pose = null, directionPermission = 'off', directionMessage = '', directionSamples = 0, lastDirectionRender = -Infinity;
  let floorArrowAngle = null;
  let lastAimSend = -Infinity, lastAimTimestamp = null, aimWasSent = false;
  const localAim = new AimHold(), localPose = new LocalSearchPose();
  let nearPose = null, nearId = null, motionAllowed = false;
  const isIndoor = () => isIndoorMode(session.mode ?? DEFAULT_ROOM_MODE);
  let indoorTracker = null;
  let indoorListener=null,indoorToken=0,indoorPending=false,nextIndoorSend=0,nextIndoorRender=0;
  let roninRequest = null;
  function syncLocalFrame(reading) {
    const id=reading.nearField?.id ?? null;
    if (id === nearId) return;
    nearId = id; localAim.reset();
    if (isIndoor()) return; // Keep the motion frame that contains the placed chest.
    localPose.reset(); nearPose = null;
    if (id) directionMessage = 'Hold the phone still and upright, then turn to search.';
  }
  const phaseOrder = ['unplaced', 'leave', 'return', 'ready', 'collected'];
  // Text in the field screen eases in when it actually changes; the value itself is set immediately.
  const swapText = (id, text) => { const el = $(id); if (el.textContent !== text) { el.textContent = text; motion.swapIn(el); } };
  const settle = (result, done) => result && typeof result.then === 'function' ? result.then(done).catch(() => { render(); }) : done(result);
  const listen = (id, event, fn) => $(id).addEventListener(event, fn);
  const setText = (id, text) => { const el = $(id); if (el.textContent !== text) el.textContent = text; };
  const chip = (id, text, tone = '') => { setText(id, text); $(id).dataset.tone = tone; };
  const show = (id, visible) => { const el = $(id); if (el.hidden !== !visible) el.hidden = !visible; };
  const notify = (id, text) => { setText(id, text); show(id, Boolean(text)); };
  const secure = () => window.isSecureContext === true;
  const cameraLive = () => Boolean(stream && !document.hidden && !video.paused && frames > 0
    && lastFrameAt !== null && now() - lastFrameAt < 2500);
  const screenAngle = () => window.screen?.orientation?.angle ?? window.orientation ?? 0;
  // Coalesce motion and video notifications into a single camera overlay update.
  function queueCameraPaint() {
    if (!stream || document.hidden || typeof window.requestAnimationFrame !== 'function') return false;
    if (cameraPaint === null) {
      const token = cameraToken;
      cameraPaint = window.requestAnimationFrame(() => {
        if (token !== cameraToken) return;
        cameraPaint = null;
        if (!stream || document.hidden) return;
        observePlaybackFrame();
        renderCamera(session.snapshot(now()), cameraLive());
      });
    }
    return true;
  }
  function renderDirection(at) {
    if (!queueCameraPaint() && at - lastDirectionRender >= 50) {
      lastDirectionRender = at;
      render();
    }
  }
  function clearDirection() {
    window.removeEventListener?.('deviceorientation', receiveDirection);
    window.removeEventListener?.('deviceorientationabsolute', receiveDirection);
    window.removeEventListener?.('devicemotion', receiveMotion);
    nearPose = null; nearId = null; localPose.reset(); motionAllowed = false;
    floorArrowAngle = null;
    pose = null; localAim.reset(); lastAimTimestamp = null; directionPermission = 'off'; directionMessage = '';
    if (aimWasSent) { aimWasSent = false; Promise.resolve(session.aim?.(null, now())).catch(() => {}); }
  }
  function receiveDirection(event) {
    if (document.hidden || (!stream && !cameraPending) || directionPermission !== 'granted') return;
    const at = now(), reading = session.snapshot(at); syncLocalFrame(reading);
    if(reading.nearField){
      if(motionAllowed)return;
      const next=localPose.orientation(event,at,screenAngle());
      nearPose=next.error?null:next;directionMessage=next.error||'';
    }else{
      if (event.type === 'deviceorientation' && event.absolute !== true && typeof event.webkitCompassHeading !== 'number'
        && pose && at - pose.at <= AR_DEFAULTS.maxAge) return;
      const next=cameraPose(event,at,screenAngle(),pose);
      pose=next.error?null:next;directionMessage=next.error||'';
    }
    directionSamples++;
    renderDirection(at);
  }
  function receiveMotion(event){
    if(document.hidden||(!stream&&!cameraPending)||directionPermission!=='granted'||!motionAllowed)return;
    const at = now(), reading = session.snapshot(at); syncLocalFrame(reading); if (!reading.nearField) return;
    const next=localPose.motion(event,at,screenAngle());nearPose=next.error?null:next;directionMessage=next.error||'';directionSamples++;
    renderDirection(at);
  }
  async function beginDirection(token) {
    if (isIndoor()) {
      directionPermission = 'granted';
      directionMessage = 'Turn and tilt the phone to find the chest.';
      return;
    }
    directionPermission='requesting';directionMessage='Allow Motion & Orientation to search for the treasure.';
    const orientation=window.DeviceOrientationEvent,motionApi=window.DeviceMotionEvent;
    if(!orientation&&!motionApi){directionPermission='unsupported';directionMessage='Motion sensors are unavailable. Use iPhone Safari.';return;}
    try{
      // Both permission requests start in the camera tap's activation, before any await.
      const ask = (api, absolute = false) => {
        if (!api) return 'unavailable';
        if (typeof api.requestPermission !== 'function') return 'granted';
        try { return absolute ? api.requestPermission(true) : api.requestPermission(); }
        catch (error) { return Promise.reject(error); }
      };
      const outcomes = await Promise.allSettled([ask(orientation, true), ask(motionApi)]);
      if(token!==cameraToken||document.hidden||(!stream&&!cameraPending))return;
      const [orientationAllowed, grantedMotion] = outcomes.map(result => result.status === 'fulfilled' && result.value === 'granted');
      motionAllowed = grantedMotion;
      directionPermission = orientationAllowed || motionAllowed ? 'granted' : 'denied';
      if(directionPermission==='granted'){
        directionMessage='Hold the phone still and upright, then turn to search.';
        window.removeEventListener?.('deviceorientation',receiveDirection);window.removeEventListener?.('deviceorientationabsolute',receiveDirection);
        if(orientationAllowed){window.addEventListener('deviceorientation',receiveDirection);window.addEventListener('deviceorientationabsolute',receiveDirection);}
        if(motionAllowed)window.addEventListener('devicemotion',receiveMotion);
      } else if (outcomes.some(result => result.status === 'rejected' && result.reason?.name === 'NotAllowedError')) {
        directionMessage = 'Tap Enable direction in Safari to request motion access.';
      } else if (outcomes.some(result => result.status === 'rejected')) {
        directionMessage = 'Motion access could not be requested. Reopen this page in Safari and retry.';
      } else {
        directionMessage = 'Motion permission denied. Check Safari access in Hardware diagnostics.';
      }
    }catch{if(token!==cameraToken)return;directionPermission='denied';directionMessage='Motion could not start. Check Safari settings and retry.';}
    if(token===cameraToken)render();
  }
  function sendAim(sample) {
    if (!session.aim || collecting) return;
    if (sample === null) {
      if (!aimWasSent) return;
      aimWasSent = false;
    } else {
      if (sample.timestamp === lastAimTimestamp) return;
      if (now() - lastAimSend < 250) return;
      lastAimSend = now(); lastAimTimestamp = sample.timestamp; aimWasSent = true;
    }
    settle(session.aim(sample, now()), () => render());
  }
  const poseFor = reading => reading.guidance?.frame === 'indoor' ? indoorTracker?.pose : reading.nearField ? nearPose : pose;
  const freshPose = selected => selected && now() - selected.at <= AR_DEFAULTS.maxAge && selected.screenAngle === screenAngle();
  function currentProjection(reading, selected = poseFor(reading), width = cameraScreen.clientWidth, height = cameraScreen.clientHeight) {
    if (!freshPose(selected) || !reading.guidance) return null;
    const aspect = width && height ? width / height : 9 / 16;
    return projectTreasure(selected, reading.guidance.bearingDegrees, aspect, reading.guidance.pitchDegrees);
  }
  function showRadarMarker(id, visible) {
    // SVG groups need the attribute changed for the [hidden] stylesheet rule.
    if (visible) $(id).removeAttribute('hidden');
    else $(id).setAttribute('hidden', '');
  }
  function renderRadar(visible, heading, bearingDegrees, distance) {
    show('motion-radar', visible);
    const radar = visible ? '1' : '';
    if (cameraScreen.dataset.radar !== radar) cameraScreen.dataset.radar = radar;
    if (!visible) return;
    const available = Number.isFinite(bearingDegrees) && Number.isFinite(distance) && distance >= 0;
    const inRange = available && distance <= radarRange;
    showRadarMarker('radar-you', heading !== null);
    showRadarMarker('radar-chest', inRange);
    showRadarMarker('radar-edge', available && !inRange);
    if (heading !== null) $('radar-you').setAttribute('transform', `rotate(${heading} 50 50)`);
    show('radar-status', !available);
    if (!available) return;
    const bearing = bearingDegrees * Math.PI / 180;
    const east = Math.sin(bearing), north = Math.cos(bearing);
    const radius = inRange ? distance / radarRange * 42 : 36;
    const position = `translate(${(east * radius).toFixed(2)} ${(-north * radius).toFixed(2)})`;
    if (inRange) $('radar-chest').setAttribute('transform', position);
    else $('radar-edge').setAttribute('transform', `${position} rotate(${bearingDegrees} 50 50)`);
  }
  function renderAR(reading, live) {
    syncLocalFrame(reading);
    const indoor = isIndoor();
    const selected = poseFor(reading);
    const { clientWidth: width = 0, clientHeight: height = 0 } = cameraScreen;
    const projection = reading.canNavigate ? currentProjection(reading, selected, width, height) : null;
    const recentVideo = live && lastFrameAt !== null && now() - lastFrameAt <= AR_DEFAULTS.maxVideoAge;
    const leaving = indoor && session.phase === 'leave';
    const position = indoor ? indoorTracker?.position : null;
    const guideOpen = guide.isOpen() || tutorials.isChoosing();
    const near = Boolean(reading.eligible && projection?.visible && recentVideo && (!indoor || position) && !guideOpen && !collecting);
    const targetVisible = Boolean(live && reading.eligible && projection?.visible);
    const heading = indoor && freshPose(selected) ? floorHeading(selected) : null;
    const groundBearing = reading.guidance?.radarBearingDegrees ?? reading.guidance?.bearingDegrees;
    const closeAim = indoor && reading.eligible;
    const floorDelta = heading !== null && Number.isFinite(groundBearing) && !leaving && !closeAim && reading.distance >= .1
      ? angleDelta(groundBearing, heading) : null;
    renderRadar(live && indoor, heading, groundBearing, reading.guidance?.distanceMeters);
    if (floorDelta === null || targetVisible) floorArrowAngle = null;
    else {
      // Keep the CSS rotation on the short arc when a bearing crosses ±180°.
      const previous = floorArrowAngle ?? floorDelta;
      floorArrowAngle = floorDelta + 360 * Math.round((previous - floorDelta) / 360);
    }
    const arrowAngle = indoor && !closeAim ? floorArrowAngle : projection?.arrowAngle;
    show('treasure', targetVisible); show('aim-reticle', live && reading.eligible && Boolean(projection));
    show('ar-guidance', live);
    show('ar-arrow', arrowAngle != null && !targetVisible);
    show('gps-spinner', live && !reading.canNavigate && !indoor);
    show('direction-retry', Boolean(stream) && directionPermission === 'denied');
    $('direction-retry').disabled = directionPermission === 'requesting';
    if (arrowAngle != null) $('ar-arrow').style?.setProperty('--bearing-delta', `${arrowAngle}deg`);
    if (targetVisible) {
      const x = projection.x * width / 2;
      const y = projection.y * height / 2;
      chest.style.setProperty('--target-x', `${x.toFixed(2)}px`);
      chest.style.setProperty('--target-y', `${y.toFixed(2)}px`);
    }
    const sample = near ? { heading: selected.heading, pitch: selected.pitch, source: selected.source, accuracy: selected.accuracy,
      frameId:selected.frameId,encounterId:reading.nearField?.id,timestamp: selected.at, cameraLive: true, videoAgeMs: Math.max(0, now() - lastFrameAt) } : null;
    if (sample) localAim.observe(sample, reading.guidance.bearingDegrees, now(), reading.guidance.pitchDegrees, position);
    else localAim.reset();
    sendAim(sample);
    const hold = localAim.snapshot(now()), ready = hold.ready && reading.canClaim && near;
    $('aim-reticle').dataset.ready = ready ? '1' : '';
    $('aim-reticle').style?.setProperty('--aim-progress', `${Math.min(100, hold.heldMs / hold.requiredMs * 100)}%`);
    show('claim', live && (reading.eligible || collecting) && !guideOpen);
    $('claim').disabled = !ready || collecting;
    setText('claim', collecting ? 'Saving claim…' : ready ? 'Claim treasure' : hold.heldMs > 0 ? 'Keep aiming…' : 'Aim to claim');
    const timer = reading.nearField ? `${Math.ceil(reading.nearField.expiresInMs / 1000)} s` : '';
    if (indoor && reading.distance != null) {
      const estimate = `Est. ${reading.distance.toFixed(1)} m`;
      setText('ar-distance', timer ? `${estimate} · ${timer}` : estimate);
    } else {
      setText('ar-distance', timer ? `Local search · ${timer}`
        : reading.distance == null ? '' : `${Math.round(reading.distance)} m away`);
    }
    const turn = indoor ? floorDelta : projection?.delta;
    let message;
    if (collecting) message = '';
    else if (!reading.canNavigate) message = indoor
      ? 'Motion lost. Close the camera, stop motion in the menu, then enable it again.' : 'GPS signal lost. Reconnecting…';
    else if (!projection) message = (indoor && locationError) || directionMessage || 'Direction reading expired. Hold the phone upright and move it gently to recalibrate.';
    else if (leaving) message = reading.distance >= INDOOR_DEFAULTS.departRadius
      ? 'Hold still to confirm you walked away.' : 'Walk away from the chest first.';
    else if (reading.eligible && guideOpen) message = 'Close the guide to resume aiming.';
    else if (ready) message = 'Tap Claim treasure.';
    else if (targetVisible) message = hold.heldMs > 0 ? 'Keep the camera on the chest.' : 'Point the camera at the chest.';
    else if (closeAim) message = 'Turn and tilt the phone towards the chest.';
    else if (indoor && !reading.nearField && reading.kind === 'inside') message = 'You are near the hiding spot. Get ready to aim.';
    else if (Math.abs(turn) > 135) message = 'Turn around to face the treasure.';
    else if (Math.abs(turn) > 15) message = `Turn ${turn < 0 ? 'left' : 'right'} towards the treasure.`;
    else if (indoor) message = 'Walk forward towards the treasure.';
    else if (!reading.eligible) message = 'Follow this direction. The chest appears when you are in range.';
    else message = selected.pitch > 10 ? 'Lower the camera towards the horizon.' : 'Raise the camera towards the horizon.';
    notify('ar-message', live ? message : '');
  }
  function renderCamera(reading, live) {
    show('camera-placeholder', !live);
    renderAR(reading, live);
    chip('camera-status', live ? 'Live video' : cameraPending ? 'Waiting for permission' : 'Starting video', live ? 'good' : '');
    notify('camera-message', live ? claimError : cameraMessage);
  }
  function syncChestArt(cardId) {
    const sprite = $('ar-chest-art'), href = chestArt(cardId);
    if (sprite.getAttribute('href') === href) return;
    sprite.setAttribute('href', href);
    chest.setAttribute('aria-label', cardId ? `${cardId.replaceAll('-', ' ')} treasure chest` : 'Treasure target');
    $('collected').dataset.card = cardId ?? '';
    if (cardId) $('claimed-chest-crest').setAttribute('href', `#crest-${cardId}`);
    else $('claimed-chest-crest').removeAttribute('href');
  }
  function stopCamera(reason = 'Camera closed.', cancelEncounter = true) {
    if(cancelEncounter&&(stream||cameraPending))session.cancelEncounter?.(now());
    if ((stream || cameraPending) && reason !== 'Camera closed.') cameraNotice = reason;
    cameraToken += 1; cameraPending = false; claimError = ''; clearDirection();
    if (cameraPaint !== null) window.cancelAnimationFrame?.(cameraPaint);
    cameraPaint = null;
    if (frameCallback !== null && typeof video.cancelVideoFrameCallback === 'function') video.cancelVideoFrameCallback(frameCallback);
    frameCallback = null;
    const previous = stream; stream = null;
    previous?.getTracks().forEach(track => track.stop());
    video.pause(); video.srcObject = null;
    $('retry-playback').hidden = true; cameraMessage = reason;
  }
  function stopLocation(reason = '') {
    indoorToken++;indoorPending=false;if(indoorListener)window.removeEventListener?.('devicemotion',indoorListener);indoorListener=null;indoorTracker=null;
    roninRequest?.abort(); roninRequest = null;
    locationToken += 1;
    if (watch !== null) navigator.geolocation?.clearWatch(watch);
    watch = null;
    if (session.connected !== false) session.stop(now());
    locationError = reason;
    stopCamera(isIndoor() ? 'Motion stopped. Enable motion to continue.' : 'Location stopped. Turn on location to continue.');
    render();
  }
  let nextGpsRetry = 0;
  function indoorSampleTime(event, at) {
    const received = window.performance?.now?.() ?? at;
    const stamp = event.timeStamp > 1e12 && window.performance ? event.timeStamp - window.performance.timeOrigin : event.timeStamp;
    return Number.isFinite(stamp) && stamp >= 0 && received - stamp <= 500 && stamp <= received + 5 ? stamp : received;
  }
  async function sendRonin(tracker, token, at) {
    if (roninRequest || at < nextIndoorSend) return;
    const batch = tracker.batch();
    if (!batch) return;
    nextIndoorSend = at + 200;
    const request = new AbortController(); roninRequest = request;
    const timeout = setTimeout(() => request.abort('timeout'), 7000);
    try {
      const velocities = await session.inferRonin(batch.payload, request.signal);
      if (token !== indoorToken || document.hidden || velocities === null) return;
      const fix = tracker.accept(batch, velocities);
      if (fix) { locationError = ''; await session.receiveIndoor(fix, now()); }
      render();
    } catch (error) {
      if (token === indoorToken && error.status !== 429) stopLocation(request.signal.reason === 'timeout'
        ? 'RoNIN timed out. Enable motion to retry.' : error.message || 'RoNIN could not estimate motion. Enable motion to retry.');
    } finally {
      clearTimeout(timeout);
      if (roninRequest === request) roninRequest = null;
    }
  }
  async function startIndoor(){
    if(!secure()||document.hidden||session.connected===false||session.data?.player.role==='guest')return;
    stopLocation();locationError='';indoorPending=true;const token=++indoorToken;
    const api=window.DeviceMotionEvent;
    if(!api){indoorPending=false;locationError='Motion sensors are unavailable. Use iPhone Safari.';render();return;}
    try{
      const request = typeof api.requestPermission === 'function' ? api.requestPermission() : 'granted';
      render();
      const permission = await request;
      if(token!==indoorToken||document.hidden||!isIndoor())return;
      indoorPending = false;
      if (permission !== 'granted') {
        locationError = 'Motion permission denied. Check Safari access in Hardware diagnostics.';
        render();
        return;
      }
      if (!session.inferRonin) { locationError = 'Indoor tracking requires a connection to the game server.'; render(); return; }
      const tracker = new IndoorRonin();
      locationError = 'Hold the phone upright and still while RoNIN starts.';
      indoorTracker = tracker; nextIndoorSend = 0; nextIndoorRender = 0; session.start(now());
      indoorListener=event=>{
        if(token!==indoorToken||document.hidden||!isIndoor())return;
        const at = now();
        const fix = tracker.observe(event, at, screenAngle(), indoorSampleTime(event, at));
        if (tracker.interrupted) { stopLocation(fix.error); return; }
        if (fix.error) {
          locationError = fix.error;
          if (!queueCameraPaint() && at >= nextIndoorRender) { nextIndoorRender = at + 100; render(); }
          return;
        }
        sendRonin(tracker, token, at);
        if (stream || cameraPending) {
          directionSamples++;
          renderDirection(at);
        }
      };
      window.addEventListener('devicemotion',indoorListener);render();
    } catch (error) {
      if (token !== indoorToken) return;
      indoorPending = false;
      locationError = error?.name === 'NotAllowedError' ? 'Tap Enable motion in Safari to request motion access.'
        : 'Motion could not start. Reopen this page in Safari and retry.';
      render();
    }
  }
  function startLocation() {
    if(isIndoor())return startIndoor();
    if (!secure() || document.hidden || session.connected === false) return;
    stopLocation(); locationError = ''; cameraNotice = '';
    if (!navigator.geolocation) { locationError = 'Location is unavailable in this browser. Use iPhone Safari.'; render(); return; }
    session.start(now()); installLocationWatch(); render();
  }
  function installLocationWatch() {
    if (watch !== null) navigator.geolocation?.clearWatch(watch);
    watch = null; const token = ++locationToken; nextGpsRetry = now() + 10000;
    try {
      watch = navigator.geolocation.watchPosition(position => {
        if (token !== locationToken || document.hidden) return;
        settle(session.receive({ latitude: position.coords.latitude, longitude: position.coords.longitude,
          accuracy: position.coords.accuracy, timestamp: position.timestamp }, now()), accepted => {
          if (token !== locationToken || document.hidden) return;
          if (accepted) locationError = '';
          render();
        });
      }, error => {
        if (token !== locationToken || document.hidden) return;
        const reasons = { 1: 'Location permission denied. Check Safari website and system settings, then retry.',
          2: 'Location unavailable. Try again in an open outdoor area.', 3: 'Location timed out. Wait for an update or restart location.' };
        // An error invalidates the last position immediately; never collect using it.
        session.loseLocation(now());
        session.log(`location-error:${error.code}`, now());
        if (error.code === 1) stopLocation(reasons[1]);
        else { locationError = 'GPS signal lost. Reconnecting…'; render(); }
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    } catch {
      stopLocation('Location could not start. Check website permissions, then retry.');
    }
    render();
  }
  function noteVideoFrame() {
    frames += 1; lastFrameAt = now();
  }
  function observePlaybackFrame() {
    if (stream && !document.hidden && typeof video.requestVideoFrameCallback !== 'function'
      && !video.paused && video.readyState >= 2 && video.currentTime > lastVideoTime) {
      lastVideoTime = video.currentTime;
      noteVideoFrame();
    }
  }
  function requestFrame(token) {
    if (typeof video.requestVideoFrameCallback !== 'function') return;
    frameCallback = video.requestVideoFrameCallback(() => {
      if (token !== cameraToken || !stream || document.hidden) return;
      noteVideoFrame();
      queueCameraPaint();
      requestFrame(token);
    });
  }
  async function startCamera() {
    if (!secure() || document.hidden || collecting || !session.snapshot(now()).canNavigate) return;
    cameraNotice = ''; cameraFailure = '';
    if (!navigator.mediaDevices?.getUserMedia) { cameraFailure = 'Camera is unavailable. Open a trusted HTTPS address.'; render(); return; }
    stopCamera(); const token = cameraToken; cameraPending = true; cameraError = null;
    frames = 0; lastFrameAt = null; cameraSettings = null; lastVideoTime = -1;
    cameraMessage = 'Allow the rear camera and Motion & Orientation to continue.';
    beginDirection(token); render();
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' },
        width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (token !== cameraToken || document.hidden || !session.snapshot(now()).canNavigate) {
        acquired.getTracks().forEach(track => track.stop());
        if (token === cameraToken) {
          stopCamera('Location changed. Wait for a fresh accurate reading, then reopen AR directions.');
          render();
        }
        return;
      }
      stream = acquired; cameraPending = false;
      const track = acquired.getVideoTracks()[0], settings = track.getSettings();
      cameraSettings = { width: settings.width, height: settings.height, facingMode: settings.facingMode || 'not-reported' };
      track.addEventListener('ended', () => {
        if (stream === acquired) { stopCamera('Camera capture ended. Please reopen it.'); session.log('camera-track-ended', now()); render(); }
      });
      video.srcObject = acquired; requestFrame(token);
      cameraMessage = 'Waiting for live video…';
      try { await video.play(); } catch {
        if (token !== cameraToken) return;
        cameraMessage = 'Tap Resume video to start the live feed.';
        $('retry-playback').hidden = false;
      }
      if (token !== cameraToken) return;
      session.log('camera-started', now()); render();
    } catch (error) {
      if (token !== cameraToken) return;
      stopCamera('Camera closed.', false); cameraError = error.name || 'Error';
      cameraFailure = error.name === 'NotAllowedError' ? 'Camera permission denied. Check Safari website settings, then retry.'
        : 'Camera could not start. Close other apps using it, then retry.';
      session.log(`camera-error:${cameraError}`, now()); render();
    }
  }
  function exitDistance() {
    if(isIndoor())return INDOOR_DEFAULTS.departRadius;
    return session.zone?.radius === 3 ? 3 : (session.zone?.radius ?? 3) + (session.data?.report.config.exitMargin ?? 10);
  }
  // One title and one sentence for the current moment of the round.
  function guidance(reading, tracking, owner, collected) {
    if (collected && !placing) return ['Treasure claimed', owner ? 'Saved on the server. Hide another one to start a new round.' : 'Saved on the server. The host can start a new round.'];
    if (isIndoor() && !owner) return ['Watch the indoor round', 'The host hunts in this mode. Open room details to see who has claimed.'];
    if (!session.zone && !owner) return ['Waiting for the host', 'The host hasn’t hidden the treasure yet. Stay on this screen.'];
    const title = placing ? 'Move the treasure' : session.zone
      ? { unplaced: 'Hide the treasure', leave: 'Walk away', return: 'Head back', ready: reading.eligible ? 'Search nearby' : 'Hold on', collected: 'Treasure claimed' }[session.phase]
      : 'Hide the treasure';
    if(isIndoor()){
      if (indoorPending) return ['Waiting for permission', 'Allow Motion & Orientation Access when Safari asks.'];
      if (!tracking) return ['Indoor mode', 'Enable motion, then hold the phone upright and still.'];
      if(reading.needsPlacement)return ['Recalibrate treasure','Motion was restarted. Hide the treasure again to establish a new local origin.'];
      if(reading.nearField&&!placing)return ['Search nearby','Open AR, look slightly down and centre the chest.'];
      if(reading.kind==='stale'||reading.kind==='waiting')return ['Waiting for motion',locationError||'Hold the phone still and upright to calibrate.'];
      if (!session.zone || placing) return ['Hide the treasure', 'Hold still to hide it. Keep the phone at about the same height while walking.'];
      return [title, session.phase === 'leave'
        ? `Walk away until the estimate reaches ${INDOOR_DEFAULTS.departRadius} m, then pause.` : 'Walk back and hold still near the hiding spot.'];
    }
    if (!tracking) return session.zone && !placing ? ['Location is off', 'Turn it on to keep hunting.'] : [title, 'Stand where you want to hide it, then turn on location.'];
    if(reading.nearField&&!placing)return [title,'Treasure locked nearby. Open AR and turn the phone to find it.'];
    const held = { stopped: 'Turn on location to continue.', waiting: 'Looking for your position. Keep this page open.',
      stale: 'That reading is too old. Waiting for a fresh one.', imprecise: 'GPS signal is weak. Move somewhere more open and wait.',
      boundary: 'You’re right at the edge. Move clearly in or out.' }[reading.kind];
    if (held) return [title, held];
    if (placing || !session.zone) return [title, placing ? 'It moves to where you’re standing, and everyone starts over.' : 'The treasure goes right where you’re standing. Everyone in this room hunts the same spot.'];
    return [title, { leave: `Go at least ${exitDistance()} m from the treasure. We’ll tell you when to turn back.`,
      return: reading.kind === 'inside' ? 'Almost there. Hold still for a few seconds.' : 'Open AR directions and follow the arrow back to the treasure.',
      ready: reading.eligible ? 'Treasure locked nearby. Turn the phone to find and aim at the chest.' : 'Your position needs to settle before you can claim.',
      unplaced: '', collected: '' }[session.phase]];
  }
  function gaugeFill(reading, collected) {
    if (placing) return 0;
    if (collected || session.phase === 'ready') return 100;
    const distance = reading.distance, reach = exitDistance();
    if (distance === null || distance === undefined || !session.zone) return 0;
    if (session.phase === 'leave') return Math.min(100, Math.round(distance / reach * 100));
    if (session.phase === 'return') return Math.max(0, Math.min(100, Math.round((1 - (distance - session.zone.radius) / reach) * 100)));
    return 0;
  }
  function renderRooms(data, tracking) {
    const nextPlayers = data ? JSON.stringify([data.player.id, data.players]) : '';
    if (nextPlayers !== playersKey) {
      playersKey = nextPlayers;
      $('players').replaceChildren(...(data?.players || []).map(player => {
        const row = document.createElement('li'), name = document.createElement('span');
        name.textContent = player.id === data.player.id ? `${player.name} (you)` : player.name;
        row.append(name);
        if (player.collected) { const mark = document.createElement('em'); mark.textContent = 'Claimed'; row.append(mark); }
        return row;
      }));
    }
    setText('sheet-room-code', data?.room.code ?? '—');
    const count = data?.room.playerCount;
    setText('player-count', count === undefined ? '' : count + (count === 1 ? ' player' : ' players'));
    $('stop-location').disabled = !tracking;
    $('stop-location').textContent = isIndoor()?(tracking?'Stop motion':'Motion is off'):(tracking?'Turn off location':'Location is off');
  }
  function renderEntry() {
    const signedIn = Boolean(session.account), guestForm = entryMode !== 'home';
    $('open-account').textContent = signedIn ? `${session.account.username} · Sign out` : 'Sign in';
    $('open-account').disabled = session.busy;
    show('entry-home', !guestForm); show('entry-form', guestForm);
    show('open-progress-home', signedIn && Boolean(session.progress));
    setText('connection-status', session.busy ? 'Connecting…' : signedIn
      ? `Signed in as ${session.account.username}. Create a room or join with a code.` : 'Playing as a guest. Sign in to keep your progress across devices.');
    $('show-create').disabled = session.busy; $('show-join').disabled = session.busy;
    $('entry-title').textContent = entryMode === 'join' ? 'Join a room' : 'Create a room';
    show('nickname-field', !signedIn); $('nickname').required = !signedIn;
    show('code-field', entryMode === 'join'); $('room-code').required = entryMode === 'join';
    $('room-code').setAttribute('enterkeyhint', signedIn ? 'go' : 'next');
    $('entry-submit').disabled = session.busy;
    $('entry-submit').textContent = session.busy ? 'Connecting…' : entryMode === 'join' ? 'Join room' : 'Create room';
    notify('connection-error', entryError || session.lastError || '');
  }
  function renderAccount() {
    if (!session.authenticate) return;
    const signedIn = Boolean(session.account);
    $('account-status').textContent = signedIn ? `Signed in as ${session.account.username}` : 'Playing as a guest';
    show('open-account-menu', !signedIn); show('logout', signedIn);
    show('open-progress-room', signedIn && Boolean(session.progress));
    show('login', !session.connected);
    for (const id of ['login', 'register', 'logout', 'open-account-menu', 'username', 'password']) $(id).disabled = session.busy || !secure();
    notify('account-error', session.lastError || (!secure() ? 'Use trusted HTTPS before entering a password.' : ''));
    $('account-hint').textContent = session.connected
      ? 'Create an account to keep this room and your claims. To sign in to an existing account, leave this room first.'
      : 'Use the same account and room code to return as the same player. There’s no password recovery.';
  }
  function renderTools(reading, owner) {
    if (sheet !== 'tools') return;
    const indoor = isIndoor();
    show('readouts', !indoor);
    show('indoor-readouts', indoor && owner);
    show('departure-tools', !indoor && owner);
    if (!indoor) {
      const fix = session.fix;
      setText('accuracy', fix ? `±${Math.round(fix.accuracy)} m` : '—');
      setText('age', fix ? `${Math.max(0, Math.floor((now() - fix.timestamp) / 1000))} s ago` : '—');
      setText('radius-value', `${$('radius').value} m`);
    } else {
      const guidance = reading.guidance;
      const bearing = guidance?.radarBearingDegrees ?? guidance?.bearingDegrees;
      const distance = guidance?.distanceMeters;
      if (Number.isFinite(bearing) && Number.isFinite(distance)) {
        const angle = bearing * Math.PI / 180;
        const offset = direction => (Math.round(-direction * distance * 10) / 10).toFixed(1);
        setText('radar-offset', `X ${offset(Math.sin(angle))} · Y ${offset(Math.cos(angle))}`);
      } else setText('radar-offset', '—');
    }
  }
  function render() {
    if ((watch !== null || indoorListener || (!isIndoor()&&indoorPending)) && session.active === false) { stopLocation('Session changed. Enable the selected mode again when ready.'); return; }
    if (session.refresh && !document.hidden && now() >= nextPoll) {
      nextPoll = now() + 2000; session.refresh().then(() => render());
    }
    observePlaybackFrame();
    const reading = session.snapshot(now());
    if(isIndoor()&&reading.needsPlacement)placing=true;
    const cameraPhase = ['return', 'ready'].includes(session.phase) || (isIndoor() && session.phase === 'leave');
    const recovering = Boolean(stream && session.zone && cameraPhase
      && (session.active ?? session.tracking) && session.connected !== false);
    if ((stream || cameraPending) && !reading.canNavigate && !recovering) stopCamera('Location is no longer suitable for direction guidance. Wait for a fresh accurate reading, then reopen the camera.');
    if (!isIndoor() && recovering && ['waiting','stale','imprecise'].includes(reading.kind) && now() >= nextGpsRetry && !document.hidden) installLocationWatch();
    if (reading.eligible) cameraNotice = '';
    const live = cameraLive(), collected = session.phase === 'collected', data = session.data;
    syncChestArt(data?.room.cardId);
    const tracking = session.active ?? session.tracking, owner = data ? data.player.role === 'owner' : true;
    const observing = isIndoor() && !owner;
    const inRoom = session.connected !== false;
    if (!inRoom && shownRound?.room) clearRoomView();
    if (sheet === 'progress' && !session.account) setSheet('');
    const screen = !booted ? 'loading' : !inRoom ? 'entry' : stream || cameraPending ? 'camera' : 'field';
    if (shownScreen && shownScreen !== screen) leaveScreen(shownScreen, screen);
    shownScreen = screen;
    $('app').dataset.screen = screen;
    for (const name of ['loading', 'entry', 'field', 'camera']) show(`screen-${name}`, screen === name);

    const names = { stopped: 'Location off', waiting: 'Searching', stale: 'Reading old', imprecise: 'Weak GPS',
      unplaced: 'GPS ready', inside: 'In range', outside: 'Out of range', boundary: 'At the edge' };
    chip('location-status', session.online === false && session.connected ? 'Reconnecting' : observing ? 'Spectating' : isIndoor()?(tracking?'Motion active':'Motion off'):names[reading.kind],
      ['inside', 'unplaced'].includes(reading.kind) ? 'good' : reading.kind === 'stopped' ? '' : 'warn');
    const [title, sentence] = guidance(reading, tracking, owner, collected);
    swapText('headline', title); swapText('message', sentence);
    notify('alert', !secure() ? 'Open the trusted HTTPS address to use location and camera.'
      : session.lastError || cameraFailure || cameraNotice || (isIndoor() && tracking ? '' : locationError));

    const showCollected = collected && !placing;
    show('gauge', !showCollected && !observing); show('collected', showCollected);
    const reward = showCollected && rewardNotice?.treasureId === data?.room.treasureId ? rewardNotice : null;
    notify('treasure-reward', reward ? `+1 Treasure · ${reward.name}${reward.unlocked ? ' unlocked' : ''}` : '');
    show('open-progress-claim', showCollected && Boolean(session.account && session.progress));
    $('gauge').dataset.tone = reading.kind === 'stopped' ? '' : ['imprecise', 'stale', 'boundary'].includes(reading.kind) ? 'warn'
      : reading.eligible ? 'good' : 'gold';
    const fill = gaugeFill(reading, collected), hasDistance = reading.distance !== null && reading.distance !== undefined;
    $('gauge-arc').setAttribute('stroke-dashoffset', String(100 - fill));
    $('gauge-arc').setAttribute('visibility', fill ? 'visible' : 'hidden');
    $('gauge-head').style?.setProperty('--angle', `${fill * 3.6}deg`);
    $('gauge').dataset.lit = fill ? '1' : '';
    $('gauge').dataset.empty = hasDistance && !placing ? '' : '1';
    // Pings quicken with progress through this leg of the round. They carry no direction.
    $('gauge').dataset.heat = !tracking || !session.zone || placing ? '0' : fill > 70 ? '3' : fill > 35 ? '2' : '1';
    $('gauge').dataset.zone = tracking && (placing || !session.zone) ? '1' : '';
    $('gauge-zone').style?.setProperty('--zone', String(.28 + Number($('radius').value) / 100 * .72));
    $('radius').style?.setProperty('--pct', `${(Number($('radius').value) - 15) / 85 * 100}%`);
    if (isIndoor()) {
      motion.count($('distance'), null);
      $('distance').textContent = hasDistance ? `${reading.distance.toFixed(1)} m` : '—';
    }
    else motion.count($('distance'), hasDistance ? Math.round(reading.distance) : null);
    swapText('distance-label', isIndoor() ? (hasDistance ? 'Estimated distance' : session.zone ? 'Waiting for motion' : 'No treasure yet') : hasDistance ? 'from treasure'
      : !tracking ? (session.zone ? 'Location off' : 'No treasure yet') : reading.kind === 'unplaced' ? 'Ready to hide' : 'Waiting for GPS');
    const receipt = data?.receipt;
    $('receipt').textContent = receipt ? `Receipt ${String(receipt.id).slice(0, 8)} · ${new Date(receipt.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';

    const steps = phaseOrder.indexOf(session.phase);
    show('steps', !observing);
    $('steps').dataset.step = String(Math.min(Math.max(steps, 0), 3));
    ['step-place', 'step-leave', 'step-return', 'step-collect'].forEach((id, index) => {
      $(id).className = index < steps ? 'done' : index === steps ? 'current' : '';
      if (index === Math.min(steps, 3)) $(id).setAttribute('aria-current', 'step');
      else $(id).removeAttribute('aria-current');
    });

    // The dock only ever offers the one next action.
    const wantsPlacement = owner && (placing || !session.zone);
    for (const [mode, id, label] of modeChoices) {
      const selected = mode === (session.mode ?? DEFAULT_ROOM_MODE);
      $(id).disabled = modeChanging || session.busy || !owner || !inRoom || selected;
      $(id).setAttribute('aria-pressed', String(selected));
      if (selected) setText('mode-status', modeChanging ? 'Switching mode…' : isIndoor() ? `${label} · host phone` : label);
    }
    show('mode-options', !pendingMode);
    show('mode-confirm', Boolean(pendingMode));
    setText('mode-question', pendingMode ? `Switch to ${pendingMode.label}?` : '');
    $('mode-apply').disabled = modeChanging || session.busy || !owner || !inRoom;
    $('mode-cancel').disabled = modeChanging;
    setText('mode-apply', modeChanging ? 'Switching…' : 'Switch and reset round');
    notify('mode-error', modeError);
    show('leave-room', Boolean(data && session.leaveRoom));
    $('leave-room').disabled = Boolean(session.busy);
    show('open-reset', Boolean(data && owner && session.resetDemo));
    $('open-reset').disabled = Boolean(session.busy);
    if (roomExitTarget) {
      const action = roomExitActions[roomExitTarget.action];
      setText('room-exit-title', action.title);
      setText('room-exit-details', owner
        ? 'This closes the room and clears its treasure, claims and guide chat. Everyone returns to the start screen.'
        : 'You’ll return to the start screen. You can rejoin with the room code.');
      $('confirm-room-exit').disabled = Boolean(session.busy);
      $('cancel-room-exit').disabled = Boolean(session.busy);
      setText('confirm-room-exit', session.busy ? action.pending : action.button);
      notify('room-exit-error', roomExitError);
    }
    setText('start-location', indoorPending ? 'Waiting for permission…' : isIndoor() ? 'Enable motion' : 'Turn on location');
    setText('location-note', isIndoor() ? 'Motion readings go to the game server. Camera video stays on this phone.'
      : 'Your location goes to the game server. Camera video stays on this phone.');
    const offerLocation = !observing && !tracking && (wantsPlacement || (Boolean(session.zone) && !collected));
    show('start-location', offerLocation); show('location-note', offerLocation);
    $('start-location').disabled = !secure() || !offerLocation || !inRoom || indoorPending || modeChanging || Boolean(session.busy);
    show('place-panel', tracking && wantsPlacement);
    show('place-note', placing); show('place-cancel', placing);
    $('place').disabled = !reading.canPlace;
    setText('place', session.busy ? 'Saving treasure…' : session.zone ? 'Move treasure here' : 'Hide treasure here');
    show('start-camera', tracking && !wantsPlacement && cameraPhase);
    $('start-camera').disabled = !reading.canNavigate || cameraPending || Boolean(stream) || collecting;
    $('start-camera').textContent = reading.eligible ? 'Find treasure in AR'
      : isIndoor() && session.phase === 'leave' ? 'Open AR radar' : 'Open AR directions';
    show('rehide', showCollected && owner);
    show('move-treasure', owner && Boolean(session.zone));

    const assist = booted && !document.hidden;
    show('assist-launchers', assist);
    $('app').dataset.assist = assist ? '1' : '';
    guide.sync(assist, reading, { cameraActive: Boolean(stream) && assist, screen: sheet || screen, tutorial: tutorials.isOpen() });
    renderCamera(reading, live);
    $('stop-camera').disabled = !stream && !cameraPending;

    renderRooms(data, tracking); renderEntry(); renderAccount(); renderTools(reading, owner);
    tutorials.sync({
      screen, sheet, entry: entryMode, owner, tracking, indoor: isIndoor(), pendingMode: pendingMode?.mode,
      signedIn: Boolean(session.account), progressTab, progressLoaded,
      codeReady: Boolean(normalizeRoomCode($('room-code').value)),
      nameReady: Boolean(session.account || $('nickname').value.trim()),
      phase: session.phase, placed: Boolean(session.zone), placing, eligible: reading.eligible,
      claimReady: !$('claim').hidden && !$('claim').disabled, reticleVisible: !$('aim-reticle').hidden,
    });
    syncModalAccess();

    $('app').dataset.sky = screen !== 'field' && screen !== 'camera' || placing ? 'dusk'
      : { unplaced: 'dusk', leave: 'night', return: 'predawn', ready: 'dawn', collected: 'sunrise' }[session.phase];
    motion.ambient(screen === 'camera' ? (live && reading.eligible ? 'sparkle' : 'none') : screen === 'entry' ? 'dust' : 'none');
    if (screen === 'field') motion.flip([$('gauge'), $('collected'), $('headline'), $('message')]);
    else motion.forgetPlaces?.();
    celebrate(screen, data);
  }
  function leaveScreen(from, to) {
    motion.forgetPlaces?.();
    const closing = from === 'camera';
    motion.ghost($(`screen-${from}`), closing
      ? [{ clipPath: 'circle(150% at 50% 50%)' }, { clipPath: 'circle(0% at 50% 50%)' }]
      : [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: `scale(${to === 'camera' ? 1.08 : 1.03})` }], closing ? 420 : to === 'camera' ? 620 : 260);
  }
  // A moment of reward whenever this player's round moves forward; never on resume or a room change.
  function celebrate(screen, data) {
    const round = { room: data?.room.code ?? '', phase: session.phase };
    const moved = shownRound && booted && shownRound.room === round.room && phaseOrder.indexOf(round.phase) > phaseOrder.indexOf(shownRound.phase);
    shownRound = round;
    if (!moved || screen !== 'field') return;
    if (round.phase === 'collected') {
      motion.flash($('flash'));
      window.setTimeout(() => { if (!$('collected').hidden) motion.burst($('collected'), 2.4); }, 620);
    } else {
      motion.pulse($('gauge'));
      motion.burst($('gauge'), round.phase === 'leave' ? .6 : round.phase === 'return' ? .8 : 1.2);
    }
  }
  function syncModalAccess() {
    const helpModal = guide.isOpen() || tutorials.isChoosing();
    $('screens').toggleAttribute?.('inert', Boolean(sheet) || helpModal);
    $('assist-launchers').toggleAttribute?.('inert', helpModal || tutorials.isOpen());
    if (sheet) {
      const panel = $(`sheet-${sheet}`);
      panel.toggleAttribute?.('inert', helpModal);
      panel.setAttribute('aria-modal', 'false');
    }
  }
  function setSheet(name) {
    if (name && !sheet) sheetOpener = document.activeElement;
    if (sheet && sheet !== name) {
      motion.ghost($(`sheet-${sheet}`), [{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], 260);
      if (!name) motion.ghost($('scrim'), [{ opacity: 1 }, { opacity: 0 }], 260);
    }
    if (name !== 'menu') { pendingMode = null; modeError = ''; }
    if (name !== 'room-exit') { roomExitTarget = null; roomExitError = ''; }
    if (sheet === 'progress' && name !== 'progress') {
      progressRequest++;
      $('leaderboard-rows').replaceChildren();
      $('treasure-book-cards').replaceChildren();
    }
    sheet = name;
    for (const id of ['menu', 'account', 'tools', 'notes', 'room-exit', 'progress']) {
      show(`sheet-${id}`, sheet === id);
      if (sheet !== id) $(`sheet-${id}`).removeAttribute('inert');
    }
    show('scrim', Boolean(sheet));
    syncModalAccess();
    if (sheet) $(`sheet-${sheet}`).focus?.({ preventScroll: true });
    else { sheetOpener?.focus?.({ preventScroll: true }); sheetOpener = null; }
  }
  function openSheet(name) { setSheet(name); render(); }
  function selectProgress(tab) {
    progressTab = tab;
    $('progress-leaderboard').setAttribute('aria-pressed', String(tab === 'leaderboard'));
    $('progress-book').setAttribute('aria-pressed', String(tab === 'book'));
    show('leaderboard-panel', progressLoaded && tab === 'leaderboard');
    show('treasure-book-panel', progressLoaded && tab === 'book');
  }
  function renderProgress({ leaderboard, self, cards }) {
    const total = cards.length;
    const rank = self.rank === null ? 'Unranked' : `Your rank #${self.rank}`;
    setText('progress-summary', `${rank} · ${self.treasuresFound} found · Collection ${self.cardsCollected}/${total}`);
    show('progress-summary', true);
    $('leaderboard-rows').replaceChildren(...leaderboard.map(entry => {
      const row = document.createElement('tr');
      if (entry.username === self.username) row.dataset.self = '1';
      for (const value of [entry.rank, entry.username, entry.treasuresFound, `${entry.cardsCollected}/${total}`]) {
        const cell = document.createElement('td');
        cell.textContent = String(value);
        row.append(cell);
      }
      return row;
    }));
    show('leaderboard-empty', leaderboard.length === 0);
    show('leaderboard-table', leaderboard.length > 0);
    const svg = 'http://www.w3.org/2000/svg';
    $('treasure-book-cards').replaceChildren(...cards.map(card => {
      const item = document.createElement('li'), name = document.createElement('strong'), status = document.createElement('span');
      const art = document.createElementNS(svg, 'svg'), sprite = document.createElementNS(svg, 'use');
      art.setAttribute('viewBox', '0 0 160 130');
      art.setAttribute('aria-hidden', 'true');
      sprite.setAttribute('href', chestArt(card.id));
      art.append(sprite);
      item.dataset.unlocked = card.unlocked ? '1' : '0';
      name.textContent = card.name; status.textContent = card.unlocked ? 'Unlocked' : 'Locked';
      item.append(art, name, status);
      if (card.story) {
        const story = document.createElement('p');
        story.textContent = card.story;
        item.append(story);
      }
      return item;
    }));
  }
  async function openProgress(tab) {
    const account = session.account;
    if (!account || !session.progress || session.busy) return;
    const request = ++progressRequest;
    progressLoaded = false;
    selectProgress(tab);
    show('progress-summary', false);
    notify('progress-status', 'Loading player progress…');
    openSheet('progress');
    try {
      const data = await session.progress();
      if (request !== progressRequest || session.account?.id !== account.id) return;
      renderProgress(data);
      progressLoaded = true;
      selectProgress(progressTab);
      notify('progress-status', '');
      render();
    } catch {
      if (request !== progressRequest) return;
      notify('progress-status', 'Could not load progress. Close the panel and try again.');
      render();
    }
  }
  listen('open-progress-home', 'click', () => openProgress('leaderboard'));
  listen('open-progress-room', 'click', () => openProgress('leaderboard'));
  listen('open-progress-claim', 'click', () => openProgress('book'));
  listen('progress-leaderboard', 'click', () => { selectProgress('leaderboard'); render(); });
  listen('progress-book', 'click', () => { selectProgress('book'); render(); });
  function closeSheet() {
    if (sheet === 'room-exit' && session.busy) return;
    setSheet(''); render();
  }
  function clearRoomView() {
    entryMode = 'home'; placing = false;
    rewardNotice = null;
    for (const id of ['nickname', 'room-code', 'notes', 'password']) $(id).value = '';
    $('radius').value = defaultRadius;
    setText('report-status', defaultReportStatus);
    clearEntryError(false);
    cameraError = cameraSettings = lastFrameAt = null;
    frames = directionSamples = 0; lastVideoTime = -1;
    locationError = cameraMessage = cameraNotice = cameraFailure = claimError = '';
    createdAt = new Date(now()).toISOString();
    setSheet('');
  }
  function openRoomExit(action) {
    const room = session.data?.room;
    if (!room || session.busy) return;
    roomExitTarget = { action, roomCode: room.code, treasureId: room.treasureId };
    openSheet('room-exit');
    $('cancel-room-exit').focus?.({ preventScroll: true });
  }
  listen('leave-room', 'click', () => openRoomExit('leave'));
  listen('open-reset', 'click', () => {
    if (session.resetDemo && session.data?.player.role === 'owner') openRoomExit('reset');
  });
  listen('cancel-room-exit', 'click', () => {
    if (!roomExitTarget || session.busy) return;
    const { menu, opener } = roomExitActions[roomExitTarget.action];
    openSheet(menu);
    $(opener).focus?.();
  });
  listen('confirm-room-exit', 'click', async () => {
    if (!roomExitTarget || session.busy) return;
    const { action, roomCode, treasureId } = roomExitTarget, room = session.data?.room;
    if (roomCode !== room?.code || treasureId !== room?.treasureId) {
      roomExitError = 'The room changed. Cancel and try again.';
      render();
      return;
    }
    roomExitError = '';
    const pending = roomExitActions[action].run({ roomCode, treasureId });
    render();
    const success = await pending;
    if (!success) roomExitError = session.lastError || 'Could not complete the request. Try again.';
    render();
    if (success) $('show-create').focus?.({ preventScroll: true });
  });
  listen('start-location', 'click', startLocation);
  listen('stop-location', 'click', () => { stopLocation(); closeSheet(); });
  listen('place', 'click', () => {
    settle(session.place(Number($('radius').value), now()), success => {
      if (success) { stopCamera('Treasure moved. Walk away to unlock AR directions.'); cameraNotice = ''; locationError = ''; placing = false; }
      else locationError = session.lastError || (isIndoor() ? 'Hold the phone steady until motion is ready.' : 'Wait for a valid position and use a radius between 3 and 100 m.');
      render();
    });
    render();
  });
  listen('radius', 'input', () => render());
  listen('rehide', 'click', () => { placing = true; render(); });
  listen('place-cancel', 'click', () => { placing = false; render(); });
  listen('move-treasure', 'click', () => { placing = true; closeSheet(); });
  async function switchMode(selection) {
    if (!selection || modeChanging || session.busy || session.connected === false) return;
    if (selection.roomCode !== session.data?.room.code || selection.treasureId !== session.data?.room.treasureId) {
      modeError = 'The round changed. Choose a mode again.';
      cancelModeConfirmation();
      return;
    }
    modeChanging = true;
    stopLocation();
    const ok = await session.setMode(selection.mode, now());
    modeChanging = false;
    pendingMode = null;
    if (ok) {
      placing = false; cameraNotice = ''; cameraFailure = '';
      if (sheet === 'menu') { closeSheet(); return; }
    } else {
      modeError = session.lastError || 'Could not switch modes. Try again.';
      if (sheet !== 'menu') locationError = modeError;
    }
    render();
    if (!ok && sheet === 'menu') $(selection.button).focus?.();
  }
  function cancelModeConfirmation() {
    const button = pendingMode?.button;
    pendingMode = null;
    render();
    if (button) $(button).focus?.();
  }
  for (const [mode, button, label] of modeChoices) listen(button, 'click', () => {
    if (!session.setMode || $(button).disabled || pendingMode) return;
    modeError = '';
    const selection = { mode, button, label, roomCode: session.data?.room.code, treasureId: session.data?.room.treasureId };
    if (!session.zone) return switchMode(selection);
    pendingMode = selection;
    render();
    $('mode-cancel').focus?.();
  });
  listen('mode-cancel', 'click', cancelModeConfirmation);
  listen('mode-apply', 'click', () => switchMode(pendingMode));
  listen('start-camera', 'click', startCamera);
  listen('stop-camera', 'click', () => { stopCamera(); session.log('camera-stopped', now()); render(); });
  listen('retry-playback', 'click', async () => {
    if (!stream || document.hidden) return;
    const token = cameraToken;
    try {
      await video.play();
      if (token !== cameraToken) return;
      show('retry-playback', false);
      cameraMessage = 'Waiting for live video…';
    } catch {
      if (token !== cameraToken) return;
      cameraMessage = 'Playback is still blocked. Close and reopen the camera.';
    }
    render();
  });
  listen('direction-retry', 'click', () => {
    if (!stream || document.hidden) return;
    pose = null;
    localAim.reset();
    const pending = beginDirection(cameraToken);
    render();
    return pending;
  });
  listen('claim', 'click', () => {
    const reading = session.snapshot(now()), projection = currentProjection(reading);
    const position = isIndoor() ? indoorTracker?.position : null;
    localAim.trackPosition(position);
    if (!guide.isOpen() && !tutorials.isChoosing() && cameraLive() && lastFrameAt !== null && now() - lastFrameAt <= AR_DEFAULTS.maxVideoAge
      && projection?.visible && projection.error <= AR_DEFAULTS.angle && localAim.snapshot(now()).ready && reading.canClaim
      && (!isIndoor() || position) && !collecting) {
      collecting = true; claimError = '';
      const token = cameraToken;
      settle(session.collect(now()), success => {
        collecting = false;
        const sameCamera = token === cameraToken;
        if (sameCamera) {
          if (success) {
            const reward = session.data?.collection?.reward;
            rewardNotice = reward ? { ...reward, treasureId: session.data.room.treasureId } : null;
            stopCamera('Collection saved by the server.');
            cameraNotice = '';
          }
          else claimError = session.lastError || 'Could not save the claim. Aim again and retry.';
        }
        render();
        if (success && sameCamera && shownScreen === 'field') $('headline').focus?.({ preventScroll: true });
      });
    }
    render();
  });
  function exportReport() {
    const reportedPose = poseFor(session.snapshot(now()));
    return { schemaVersion: 1, experiment: 'location-trigger-camera-overlay', createdAt,
      exportedAt: new Date(now()).toISOString(), target: 'iPhone Safari',
      environment: { userAgent: navigator.userAgent, secureContext: secure(), visibility: document.visibilityState,
        browserIdentity: 'must-be-confirmed-by-user' },
      ...session.report(now()), camera: { running: Boolean(stream), pending: cameraPending, framesObserved: frames,
        live: cameraLive(), settings: cameraSettings, lastFrameAgeMs: lastFrameAt === null ? null : now() - lastFrameAt, error: cameraError },
      ar: { permission: directionPermission, validSamples: directionSamples, source: reportedPose?.source ?? null,
        orientationAgeMs: reportedPose ? Math.max(0, now() - reportedPose.at) : null, aim: localAim.snapshot(now()), config: AR_DEFAULTS,
        worldAnchored: false, localFixedHeight: isIndoor() },
      includesCoordinates: false, notes: $('notes').value,
      limitations: ['Camera overlay has no world anchoring or spatial tracking.', 'Location accuracy is provider-reported, not measured error.',
        'The user must confirm Safari and physical field observations.', 'Accounts do not verify student identity. Client location and camera claims are not anti-cheat proof.'] };
  }
  listen('download-report', 'click', () => {
    const data = exportReport(), blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `campus-quest-treasure-${data.exportedAt.replace(/:/g, '-')}.json`;
    document.body.append(link); link.click(); link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    $('report-status').textContent = 'Report generated without automatic location coordinates. Review your notes before sharing.';
  });
  function pause() {
    guide.stop();
    tutorials.dismiss(false);
    stopLocation(isIndoor() ? 'Paused in the background. Enable motion to continue.' : 'Paused in the background. Turn on location to continue.');
    window.clearInterval(timer); timer = null;
    session.log('background-hardware-stopped', now());
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else { if (timer === null) timer = window.setInterval(render, 500); render(); }
  });
  window.addEventListener('pagehide', pause);
  window.addEventListener('pageshow', () => { if (!document.hidden && timer === null) timer = window.setInterval(render, 500); render(); });
  // Safari only applies :active press states once a touch listener exists.
  document.addEventListener('touchstart', () => {}, { passive: true });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !tutorials.dismiss() && !guide.close() && sheet) closeSheet();
  });
  listen('scrim', 'click', closeSheet);
  document.querySelectorAll?.('[data-close-sheet]').forEach(button => button.addEventListener('click', closeSheet));
  listen('open-menu', 'click', () => openSheet('menu'));
  listen('open-tools', 'click', () => openSheet('tools'));
  listen('tools-back', 'click', () => { openSheet('menu'); $('open-tools').focus?.(); });
  listen('open-notes', 'click', () => openSheet('notes'));
  listen('notes-back', 'click', () => { openSheet('tools'); $('open-notes').focus?.(); });
  listen('copy-code', 'click', () => {
    const code = session.data?.room.code; if (!code) return;
    const label = text => { $('copy-code').textContent = text; window.setTimeout(() => { $('copy-code').textContent = 'Copy code'; }, 1500); };
    (navigator.clipboard?.writeText(code) ?? Promise.reject()).then(() => label('Copied'), () => label('Copy failed'));
  });
  function connect(code) {
    if (session.busy) return;
    clearEntryError();
    stopLocation();
    const result = session.connect($('nickname').value, code);
    render();
    result.then(joined => {
      if (joined) { entryMode = 'home'; $('room-code').value = ''; }
      else entryError = session.lastError || 'Could not open the room. Try again.';
      render();
      if (joined && shownScreen === 'field') $('headline').focus?.({ preventScroll: true });
      if (!joined && shownScreen === 'entry') $('connection-error').scrollIntoView?.({ block: 'nearest' });
    });
  }
  function clearEntryError(clearServerError = true) {
    entryError = '';
    if (clearServerError) session.lastError = '';
    $('room-code').removeAttribute('aria-invalid');
    notify('room-code-error', '');
  }
  function chooseEntry(mode) {
    // Signed-in players already have a name, so creating needs no further input.
    if (mode === 'create' && session.account) { connect(''); return; }
    clearEntryError();
    entryMode = mode; render();
    $(session.account || mode === 'join' ? 'room-code' : 'nickname').focus?.();
  }
  if (session.connect) {
    const viewport = window.visualViewport;
    if (viewport) {
      const fitEntry = () => {
        const entry = $('screen-entry');
        const inset = window.innerHeight - viewport.height;
        entry.dataset.keyboard = String(viewport.scale === 1 && inset > 80);
        entry.style.setProperty('--entry-top', `${viewport.offsetTop}px`);
        entry.style.setProperty('--entry-bottom', `${Math.max(0, inset - viewport.offsetTop)}px`);
      };
      viewport.addEventListener('resize', fitEntry);
      viewport.addEventListener('scroll', fitEntry);
      fitEntry();
    }
    listen('show-create', 'click', () => chooseEntry('create'));
    listen('show-join', 'click', () => chooseEntry('join'));
    listen('entry-cancel', 'click', () => {
      const opener = entryMode === 'join' ? 'show-join' : 'show-create';
      entryMode = 'home'; clearEntryError(); render();
      $(opener).focus?.();
    });
    for (const id of ['room-code', 'nickname']) listen(id, 'input', () => { clearEntryError(); render(); });
    listen('entry-form', 'submit', event => {
      event.preventDefault();
      if (session.busy) return;
      clearEntryError();
      const input = $('room-code');
      const code = entryMode === 'join' ? normalizeRoomCode(input.value) : '';
      if (code === null) {
        input.setAttribute('aria-invalid', 'true');
        notify('room-code-error', 'Enter the four digits from your host. Older eight-character codes also work.');
        input.focus?.();
        $('room-code-error').scrollIntoView?.({ block: 'nearest' });
        return;
      }
      if (code) input.value = code;
      if (!$('entry-form').reportValidity()) { render(); return; }
      connect(code);
    });
    session.resume().then(() => { booted = true; render(); });
  }
  if (session.authenticate) {
    const authenticate = async action => {
      if (!$('account-form').reportValidity()) return;
      stopLocation();
      const pending = session.authenticate(action, $('username').value, $('password').value);
      $('password').value = ''; render();
      if (await pending) { entryMode = 'home'; clearEntryError(); setSheet(''); }
      render();
    };
    const logout = async () => {
      const pending = session.logout(); render();
      if (await pending) clearEntryError();
      entryMode = 'home'; render();
    };
    listen('account-form', 'submit', event => { event.preventDefault(); authenticate(session.connected ? 'register' : 'login'); });
    listen('register', 'click', () => authenticate('register'));
    listen('logout', 'click', () => openRoomExit('logout'));
    listen('open-account', 'click', () => { if (session.account) logout(); else openSheet('account'); });
    listen('open-account-menu', 'click', () => openSheet('account'));
  }
  $('environment').textContent = secure() ? '' : 'Open the trusted HTTPS address to sign in and use location or camera.';
  $('environment').hidden = secure();
  timer = window.setInterval(render, 500); render();
  return { session, render, exportReport };
}

if (typeof document !== 'undefined') mountTreasureLab({ document, window, navigator });
