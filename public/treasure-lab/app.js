import { mountGuide } from './guide.js';
import { RemoteTreasureSession } from './client.js';
import { AR_DEFAULTS, AimHold, cameraPose, projectTreasure } from './ar.js';

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
  const createdAt = new Date(now()).toISOString();
  const video = $('camera');
  const guide = mountGuide({ document, session, window, now, onToggle: () => render() });
  let watch = null, locationToken = 0, stream = null, cameraToken = 0, frameCallback = null;
  let cameraPending = false, cameraError = null, cameraSettings = null;
  let frames = 0, lastFrameAt = null, lastVideoTime = -1, timer = null;
  let locationError = '', cameraMessage = '', cameraNotice = '', cameraFailure = '', nextPoll = 0, collecting = false;
  // Which screen is showing follows session state; these only track what the player has opened.
  let booted = !session.connect, entryMode = 'home', switching = false, placing = false, sheet = '', sheetOpener = null;
  let playersKey = '', shortcutsKey = '', shownScreen = '', shownRound = null;
  let pose = null, directionPermission = 'off', directionMessage = '', directionSamples = 0, lastDirectionRender = -Infinity;
  let lastAimSend = -Infinity, lastAimTimestamp = null, aimWasSent = false;
  const localAim = new AimHold();
  const phaseOrder = ['unplaced', 'leave', 'return', 'ready', 'collected'];
  // Text in the field screen eases in when it actually changes; the value itself is set immediately.
  const swapText = (id, text) => { const el = $(id); if (el.textContent !== text) { el.textContent = text; motion.swapIn(el); } };
  const settle = (result, done) => result && typeof result.then === 'function' ? result.then(done).catch(() => { render(); }) : done(result);
  const listen = (id, event, fn) => $(id).addEventListener(event, fn);
  const chip = (id, text, tone = '') => { $(id).textContent = text; $(id).dataset.tone = tone; };
  const show = (id, visible) => { $(id).hidden = !visible; };
  const notify = (id, text) => { $(id).textContent = text; $(id).hidden = !text; };
  const secure = () => window.isSecureContext === true;
  const cameraLive = () => Boolean(stream && !document.hidden && !video.paused && frames > 0
    && lastFrameAt !== null && now() - lastFrameAt < 2500);
  const screenAngle = () => window.screen?.orientation?.angle ?? window.orientation ?? 0;
  const aspect = () => {
    const screen = $('screen-camera');
    return screen.clientWidth && screen.clientHeight ? screen.clientWidth / screen.clientHeight : 9 / 16;
  };
  function clearDirection() {
    window.removeEventListener?.('deviceorientation', receiveDirection);
    window.removeEventListener?.('deviceorientationabsolute', receiveDirection);
    pose = null; localAim.reset(); lastAimTimestamp = null; directionPermission = 'off'; directionMessage = '';
    if (aimWasSent) { aimWasSent = false; Promise.resolve(session.aim?.(null, now())).catch(() => {}); }
  }
  function receiveDirection(event) {
    if (document.hidden || (!stream && !cameraPending) || directionPermission !== 'granted') return;
    // Some browsers fire relative and absolute streams together. Never downgrade a fresh absolute reading.
    if (event.type === 'deviceorientation' && event.absolute !== true && typeof event.webkitCompassHeading !== 'number'
      && pose && now() - pose.at <= AR_DEFAULTS.maxAge) return;
    const next = cameraPose(event, now(), screenAngle(), pose);
    if (next.error) { pose = null; localAim.reset(); directionMessage = next.error; }
    else { pose = next; directionMessage = ''; directionSamples++; }
    if (now() - lastDirectionRender >= 50) { lastDirectionRender = now(); render(); }
  }
  async function beginDirection(token) {
    directionPermission = 'requesting'; directionMessage = 'Allow Motion & Orientation to show the treasure direction.';
    const api = window.DeviceOrientationEvent;
    if (!api) { directionPermission = 'unsupported'; directionMessage = 'Compass direction is unavailable in this browser. Use iPhone Safari with Motion & Orientation access.'; return; }
    try {
      // Called directly from the camera / retry tap before awaiting camera acquisition.
      const permission = typeof api.requestPermission === 'function' ? await api.requestPermission(true) : 'granted';
      if (token !== cameraToken || document.hidden || (!stream && !cameraPending)) return;
      directionPermission = permission === 'granted' ? 'granted' : 'denied';
      if (permission === 'granted') {
        directionMessage = 'Waiting for compass readings. Hold the rear camera towards the horizon.';
        window.removeEventListener?.('deviceorientation', receiveDirection);
        window.removeEventListener?.('deviceorientationabsolute', receiveDirection);
        window.addEventListener('deviceorientation', receiveDirection);
        window.addEventListener('deviceorientationabsolute', receiveDirection);
      } else directionMessage = 'Direction permission denied. Allow Motion & Orientation in Safari, then retry.';
    } catch {
      if (token !== cameraToken) return;
      directionPermission = 'denied'; directionMessage = 'Direction could not start. Check Safari Motion & Orientation access and retry.';
    }
    if (token === cameraToken) render();
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
  function currentProjection(reading) {
    return pose && now() - pose.at <= AR_DEFAULTS.maxAge && pose.screenAngle === screenAngle() && reading.guidance
      ? projectTreasure(pose, reading.guidance.bearingDegrees, aspect()) : null;
  }
  function renderAR(reading, live) {
    const projection = reading.canNavigate ? currentProjection(reading) : null;
    const recentVideo = live && lastFrameAt !== null && now() - lastFrameAt <= AR_DEFAULTS.maxVideoAge;
    const near = Boolean(reading.eligible && projection?.visible && recentVideo && !guide.isOpen());
    const targetVisible = Boolean(live && reading.eligible && projection?.visible);
    show('treasure', targetVisible); show('aim-reticle', live && reading.eligible && Boolean(projection));
    show('ar-guidance', live);
    show('ar-arrow', Boolean(projection) && !targetVisible);
    show('gps-spinner', live && !reading.canNavigate);
    show('direction-retry', Boolean(stream) && directionPermission === 'denied');
    $('direction-retry').disabled = directionPermission === 'requesting';
    if (projection) {
      $('ar-arrow').style?.setProperty('--bearing-delta', `${projection.arrowAngle}deg`);
      if (targetVisible) {
        $('treasure').style?.setProperty('--target-x', `${50 + projection.x * 50}%`);
        $('treasure').style?.setProperty('--target-y', `${50 + projection.y * 50}%`);
      }
    }
    const sample = near ? { heading: pose.heading, pitch: pose.pitch, source: pose.source, accuracy: pose.accuracy,
      timestamp: pose.at, cameraLive: true, videoAgeMs: Math.max(0, now() - lastFrameAt) } : null;
    if (sample) localAim.observe(sample, reading.guidance.bearingDegrees, now());
    else localAim.reset();
    sendAim(sample);
    const hold = localAim.snapshot(now()), ready = hold.ready && reading.canClaim && near;
    $('aim-reticle').dataset.ready = ready ? '1' : '';
    $('aim-reticle').style?.setProperty('--aim-progress', `${Math.min(100, hold.heldMs / hold.requiredMs * 100)}%`);
    show('claim', live && reading.eligible && !guide.isOpen());
    $('claim').disabled = !ready || collecting;
    $('claim').textContent = collecting ? 'Claiming…' : ready ? 'Claim treasure' : hold.heldMs > 0 ? 'Hold steady…' : 'Aim to claim';
    $('ar-distance').textContent = reading.distance == null ? '' : `${Math.round(reading.distance)} m away`;
    let message;
    if (!reading.canNavigate) message = 'GPS signal lost. Reconnecting…';
    else if (!projection) message = directionMessage || 'Direction reading expired. Hold the phone upright and move it gently to recalibrate.';
    else if (targetVisible) message = ready ? 'Target locked. Tap Claim treasure.' : 'Centre the chest in the reticle and hold steady.';
    else if (Math.abs(projection.delta) > 135) message = 'Turn around to face the treasure.';
    else if (Math.abs(projection.delta) > 15) message = `Turn ${projection.delta < 0 ? 'left' : 'right'} towards the treasure.`;
    else if (!reading.eligible) message = 'Follow this direction. The chest appears when you are in range.';
    else message = pose.pitch > 10 ? 'Lower the camera towards the horizon.' : 'Raise the camera towards the horizon.';
    $('ar-message').textContent = message;
  }
  function stopCamera(reason = 'Camera closed.') {
    if ((stream || cameraPending) && reason !== 'Camera closed.') cameraNotice = reason;
    cameraToken += 1; cameraPending = false; clearDirection(); guide.stop();
    if (frameCallback !== null && typeof video.cancelVideoFrameCallback === 'function') video.cancelVideoFrameCallback(frameCallback);
    frameCallback = null;
    const previous = stream; stream = null;
    previous?.getTracks().forEach(track => track.stop());
    video.pause(); video.srcObject = null;
    $('retry-playback').hidden = true; cameraMessage = reason;
  }
  function stopLocation(reason = '') {
    locationToken += 1;
    if (watch !== null) navigator.geolocation?.clearWatch(watch);
    watch = null; session.stop(now()); locationError = reason;
    stopCamera('Location stopped and camera released. Turn location back on when ready.');
    render();
  }
  let nextGpsRetry = 0;
  function startLocation() {
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
  function frameArrived(token) {
    if (token !== cameraToken || !stream || document.hidden) return;
    frames += 1; lastFrameAt = now();
  }
  function requestFrame(token) {
    if (typeof video.requestVideoFrameCallback !== 'function') return;
    frameCallback = video.requestVideoFrameCallback(() => {
      frameArrived(token);
      if (token === cameraToken && stream) requestFrame(token);
    });
  }
  async function startCamera() {
    if (!secure() || document.hidden || !session.snapshot(now()).canNavigate) return;
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
      try { await video.play(); } catch {
        if (token !== cameraToken) return;
        $('retry-playback').hidden = false;
      }
      if (token !== cameraToken) return;
      cameraMessage = 'Waiting for live video…';
      session.log('camera-started', now()); render();
    } catch (error) {
      if (token !== cameraToken) return;
      stopCamera(); cameraError = error.name || 'Error';
      cameraFailure = error.name === 'NotAllowedError' ? 'Camera permission denied. Check Safari website settings, then retry.'
        : 'Camera could not start. Close other apps using it, then retry.';
      session.log(`camera-error:${cameraError}`, now()); render();
    }
  }
  function exitDistance() {
    return session.zone?.radius === 3 ? 3 : (session.zone?.radius ?? 3) + (session.data?.report.config.exitMargin ?? 10);
  }
  // One title and one sentence for the current moment of the round.
  function guidance(reading, tracking, owner, collected) {
    if (collected && !placing) return ['Treasure claimed', owner ? 'Saved on the server. Hide another one to start a new round.' : 'Saved on the server. The host can start a new round.'];
    if (!session.zone && !owner) return ['Waiting for the host', 'The host hasn’t hidden the treasure yet. Stay on this screen.'];
    const title = placing ? 'Move the treasure' : session.zone
      ? { unplaced: 'Hide the treasure', leave: 'Walk away', return: 'Head back', ready: reading.eligible ? 'Treasure found' : 'Hold on', collected: 'Treasure claimed' }[session.phase]
      : 'Hide the treasure';
    if (!tracking) return session.zone && !placing ? ['Location is off', 'Turn it on to keep hunting.'] : [title, 'Stand where you want to hide it, then turn on location.'];
    const held = { stopped: 'Turn on location to continue.', waiting: 'Looking for your position. Keep this page open.',
      stale: 'That reading is too old. Waiting for a fresh one.', imprecise: 'GPS accuracy is weaker than 20 m. Move somewhere more open and wait.',
      boundary: 'You’re right at the edge. Move clearly in or out.' }[reading.kind];
    if (held) return [title, held];
    if (placing || !session.zone) return [title, placing ? 'It moves to where you’re standing, and everyone starts over.' : 'The treasure goes right where you’re standing. Everyone in this room hunts the same spot.'];
    return [title, { leave: `Go at least ${exitDistance()} m from the treasure. We’ll tell you when to turn back.`,
      return: reading.kind === 'inside' ? 'Almost there. Hold still for a few seconds.' : 'Open AR directions and follow the arrow back to the treasure.',
      ready: reading.eligible ? 'Find the chest in AR, centre it and hold steady to claim.' : 'Your position needs to settle before you can claim.',
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
    const roomList = (session.accountRooms || []).filter(room => room.code !== data?.room.code);
    const nextShortcuts = roomList.map(room => room.code).join();
    if (nextShortcuts !== shortcutsKey) {
      shortcutsKey = nextShortcuts;
      $('room-shortcuts').replaceChildren(...roomList.map(room => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'chip'; button.textContent = room.code;
        button.setAttribute('aria-label', `Return to room ${room.code}`);
        button.addEventListener('click', () => connect(room.code));
        return button;
      }));
    }
    show('room-shortcuts', roomList.length > 0);
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
    $('room-label').textContent = data?.room.code ?? '—';
    $('sheet-room-code').textContent = data?.room.code ?? '—';
    $('player-count').textContent = data ? `· ${data.room.playerCount}` : '';
    if (data) $('open-room').setAttribute('aria-label', `Room ${data.room.code}, ${data.room.playerCount} players. Open room details.`);
    $('stop-location').disabled = !tracking;
    $('stop-location').textContent = tracking ? 'Turn off location' : 'Location is off';
  }
  function renderEntry(data) {
    const signedIn = Boolean(session.account), guestForm = entryMode !== 'home';
    show('entry-back', switching && session.connected === true);
    $('open-account').textContent = signedIn ? `${session.account.username} · Sign out` : 'Sign in';
    $('open-account').disabled = session.busy;
    show('entry-home', !guestForm); show('entry-form', guestForm);
    $('connection-status').textContent = session.busy ? 'Connecting…' : data && switching ? `You’re in room ${data.room.code}. Pick another room.`
      : signedIn ? `Signed in as ${session.account.username}. Pick a room or create one.` : 'Playing as a guest. Sign in to keep your place across devices.';
    $('show-create').disabled = session.busy; $('show-join').disabled = session.busy;
    $('entry-title').textContent = entryMode === 'join' ? 'Join a room' : 'Create a room';
    show('nickname-field', !signedIn); $('nickname').required = !signedIn;
    show('code-field', entryMode === 'join'); $('room-code').required = entryMode === 'join';
    $('entry-submit').disabled = session.busy;
    $('entry-submit').textContent = session.busy ? 'Connecting…' : entryMode === 'join' ? 'Join room' : 'Create room';
    notify('connection-error', session.lastError || '');
  }
  function renderAccount() {
    if (!session.authenticate) return;
    const signedIn = Boolean(session.account);
    $('account-status').textContent = signedIn ? `Signed in as ${session.account.username}` : 'Playing as a guest';
    show('open-account-menu', !signedIn); show('logout', signedIn);
    for (const id of ['login', 'register', 'logout', 'username', 'password']) $(id).disabled = session.busy || !secure();
    notify('account-error', session.lastError || (!secure() ? 'Use trusted HTTPS before entering a password.' : ''));
    $('account-hint').textContent = session.connected
      ? 'Creating an account keeps this room and your claims. Signing in switches to that account’s rooms instead. There’s no password recovery.'
      : 'Use the same account on another device to come back as the same player. There’s no password recovery, so pick something you’ll remember.';
  }
  function render() {
    if (watch !== null && session.active === false) { stopLocation('Session changed. Turn location back on when ready.'); return; }
    if (session.refresh && !document.hidden && now() >= nextPoll) {
      nextPoll = now() + 2000; session.refresh().then(() => render());
    }
    if (stream && typeof video.requestVideoFrameCallback !== 'function'
      && !video.paused && video.readyState >= 2 && video.currentTime > lastVideoTime) {
      lastVideoTime = video.currentTime; frameArrived(cameraToken);
    }
    const reading = session.snapshot(now());
    const recovering = Boolean(stream && session.zone && ['return', 'ready'].includes(session.phase)
      && (session.active ?? session.tracking) && session.connected !== false);
    if ((stream || cameraPending) && !reading.canNavigate && !recovering) stopCamera('Location is no longer suitable for direction guidance. Wait for a fresh accurate reading, then reopen the camera.');
    if (recovering && !reading.canNavigate && now() >= nextGpsRetry && !document.hidden) installLocationWatch();
    if (reading.eligible) cameraNotice = '';
    const live = cameraLive(), collected = session.phase === 'collected', data = session.data;
    const tracking = session.active ?? session.tracking, owner = data ? data.player.role === 'owner' : true;
    const inRoom = session.connected !== false;
    const screen = !booted ? 'loading' : !inRoom || switching ? 'entry' : stream || cameraPending ? 'camera' : 'field';
    if (shownScreen && shownScreen !== screen) leaveScreen(shownScreen, screen);
    shownScreen = screen;
    $('app').dataset.screen = screen;
    for (const name of ['loading', 'entry', 'field', 'camera']) show(`screen-${name}`, screen === name);
    if (!inRoom) { placing = false; if (sheet === 'menu' || sheet === 'notes') setSheet(''); }

    const names = { stopped: 'Location off', waiting: 'Searching', stale: 'Reading old', imprecise: 'Weak GPS',
      unplaced: 'GPS ready', inside: 'In range', outside: 'Out of range', boundary: 'At the edge' };
    chip('location-status', session.online === false && session.connected ? 'Reconnecting' : names[reading.kind],
      ['inside', 'unplaced'].includes(reading.kind) ? 'good' : reading.kind === 'stopped' ? '' : 'warn');
    const [title, sentence] = guidance(reading, tracking, owner, collected);
    swapText('headline', title); swapText('message', sentence);
    notify('alert', !secure() ? 'Open the trusted HTTPS address to use location and camera.'
      : session.lastError || locationError || cameraFailure || cameraNotice);

    const showCollected = collected && !placing;
    show('gauge', !showCollected); show('collected', showCollected);
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
    motion.count($('distance'), hasDistance ? Math.round(reading.distance) : null);
    swapText('distance-label', hasDistance ? 'from treasure'
      : !tracking ? (session.zone ? 'Location off' : 'No treasure yet') : reading.kind === 'unplaced' ? 'Ready to hide' : 'Waiting for GPS');
    const receipt = data?.receipt;
    $('receipt').textContent = receipt ? `Receipt ${String(receipt.id).slice(0, 8)} · ${new Date(receipt.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';
    show('readouts', tracking && !showCollected);
    $('accuracy').textContent = session.fix ? `±${Math.round(session.fix.accuracy)} m` : '—';
    $('age').textContent = session.fix ? `${Math.max(0, Math.floor((now() - session.fix.timestamp) / 1000))} s ago` : '—';

    const steps = phaseOrder.indexOf(session.phase);
    $('steps').dataset.step = String(Math.min(Math.max(steps, 0), 3));
    ['step-place', 'step-leave', 'step-return', 'step-collect'].forEach((id, index) => {
      $(id).className = index < steps ? 'done' : index === steps ? 'current' : '';
      if (index === Math.min(steps, 3)) $(id).setAttribute('aria-current', 'step');
      else $(id).removeAttribute('aria-current');
    });

    // The dock only ever offers the one next action.
    const wantsPlacement = owner && (placing || !session.zone);
    const offerLocation = !tracking && (wantsPlacement || (Boolean(session.zone) && !collected));
    show('start-location', offerLocation); show('location-note', offerLocation);
    $('start-location').disabled = !secure() || tracking || session.connected === false;
    show('place-panel', tracking && wantsPlacement);
    show('place-note', placing); show('place-cancel', placing);
    $('place').disabled = !reading.canPlace;
    $('place').textContent = session.zone ? 'Move treasure here' : 'Hide treasure here';
    $('radius-value').textContent = `${$('radius').value} m`;
    show('start-camera', tracking && !wantsPlacement && ['return', 'ready'].includes(session.phase));
    $('start-camera').disabled = !reading.canNavigate || cameraPending || Boolean(stream);
    $('start-camera').textContent = reading.eligible ? 'Find treasure in AR' : 'Open AR directions';
    show('rehide', showCollected && owner);
    show('move-treasure', owner && Boolean(session.zone));

    show('camera-placeholder', !live);
    guide.sync(Boolean(stream) && !document.hidden, reading);
    renderAR(reading, live);
    $('stop-camera').disabled = !stream && !cameraPending;
    chip('camera-status', live ? 'Live video' : cameraPending ? 'Waiting for permission' : 'Starting video', live ? 'good' : '');
    $('camera-message').textContent = !$('retry-playback').hidden ? 'Tap Resume video. Claiming needs a live picture.'
      : live ? (!reading.canNavigate ? 'GPS signal lost. Reconnecting…' : 'Follow the arrow, then centre the chest.') : cameraMessage;

    renderRooms(data, tracking); renderEntry(data); renderAccount();

    $('app').dataset.sky = screen !== 'field' && screen !== 'camera' || placing ? 'dusk'
      : { unplaced: 'dusk', leave: 'night', return: 'predawn', ready: 'dawn', collected: 'sunrise' }[session.phase];
    motion.ambient(screen === 'camera' ? (live && reading.eligible ? 'sparkle' : 'none') : screen === 'entry' ? 'dust' : 'none');
    if (screen === 'field') motion.flip([$('gauge'), $('collected'), $('headline'), $('message'), $('readouts')]);
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
  function setSheet(name) {
    if (name && !sheet) sheetOpener = document.activeElement;
    if (sheet && sheet !== name) {
      motion.ghost($(`sheet-${sheet}`), [{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], 260);
      if (!name) motion.ghost($('scrim'), [{ opacity: 1 }, { opacity: 0 }], 260);
    }
    sheet = name;
    for (const id of ['menu', 'account', 'notes']) show(`sheet-${id}`, sheet === id);
    show('scrim', Boolean(sheet));
    if (sheet) { $('screens').setAttribute('inert', ''); $(`sheet-${sheet}`).focus?.({ preventScroll: true }); }
    else { $('screens').removeAttribute('inert'); sheetOpener?.focus?.({ preventScroll: true }); sheetOpener = null; }
  }
  function openSheet(name) { setSheet(name); render(); }
  function closeSheet() { setSheet(''); render(); }
  listen('start-location', 'click', startLocation);
  listen('stop-location', 'click', () => { stopLocation(); closeSheet(); });
  listen('place', 'click', () => {
    settle(session.place(Number($('radius').value), now()), success => {
      if (success) { stopCamera('Treasure moved. Walk away to unlock AR directions.'); cameraNotice = ''; locationError = ''; placing = false; }
      else locationError = session.lastError || 'Wait for a valid position and use a radius between 3 and 100 m.';
      render();
    });
    render();
  });
  listen('radius', 'input', () => render());
  listen('rehide', 'click', () => { placing = true; render(); });
  listen('place-cancel', 'click', () => { placing = false; render(); });
  listen('move-treasure', 'click', () => { placing = true; closeSheet(); });
  listen('start-camera', 'click', startCamera);
  listen('stop-camera', 'click', () => { stopCamera(); session.log('camera-stopped', now()); render(); });
  listen('retry-playback', 'click', async () => {
    if (!stream || document.hidden || !session.snapshot(now()).canNavigate) return;
    try { await video.play(); $('retry-playback').hidden = true; } catch { cameraMessage = 'Playback is still blocked. Close and reopen the camera.'; }
    render();
  });
  listen('direction-retry', 'click', () => { if (stream && !document.hidden) { pose = null; localAim.reset(); beginDirection(cameraToken); render(); } });
  listen('claim', 'click', () => {
    const reading = session.snapshot(now()), projection = currentProjection(reading);
    if (!guide.isOpen() && cameraLive() && lastFrameAt !== null && now() - lastFrameAt <= AR_DEFAULTS.maxVideoAge
      && projection?.visible && projection.error <= AR_DEFAULTS.angle && localAim.snapshot(now()).ready && reading.canClaim && !collecting) {
      collecting = true;
      settle(session.collect(now()), success => { collecting = false; if (success) { stopCamera('Collection saved by the server.'); cameraNotice = ''; } render(); });
    }
    render();
  });
  function exportReport() {
    return { schemaVersion: 1, experiment: 'location-trigger-camera-overlay', createdAt,
      exportedAt: new Date(now()).toISOString(), target: 'iPhone Safari',
      environment: { userAgent: navigator.userAgent, secureContext: secure(), visibility: document.visibilityState,
        browserIdentity: 'must-be-confirmed-by-user' },
      ...session.report(now()), camera: { running: Boolean(stream), pending: cameraPending, framesObserved: frames,
        live: cameraLive(), settings: cameraSettings, lastFrameAgeMs: lastFrameAt === null ? null : now() - lastFrameAt, error: cameraError },
      ar: { permission: directionPermission, validSamples: directionSamples, source: pose?.source ?? null,
        orientationAgeMs: pose ? Math.max(0, now() - pose.at) : null, aim: localAim.snapshot(now()), config: AR_DEFAULTS, worldAnchored: false },
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
  function pause(reason) {
    stopLocation(reason); window.clearInterval(timer); timer = null;
    session.log('background-hardware-stopped', now());
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause('Paused while in the background. Turn location back on to continue.');
    else { if (timer === null) timer = window.setInterval(render, 500); render(); }
  });
  window.addEventListener('pagehide', () => pause('Paused when you left. Turn location back on to continue.'));
  window.addEventListener('pageshow', () => { if (!document.hidden && timer === null) timer = window.setInterval(render, 500); render(); });
  // Safari only applies :active press states once a touch listener exists.
  document.addEventListener('touchstart', () => {}, { passive: true });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && sheet) closeSheet(); });
  listen('scrim', 'click', closeSheet);
  document.querySelectorAll?.('[data-close-sheet]').forEach(button => button.addEventListener('click', closeSheet));
  listen('open-menu', 'click', () => openSheet('menu'));
  listen('open-room', 'click', () => openSheet('menu'));
  listen('open-notes', 'click', () => openSheet('notes'));
  listen('copy-code', 'click', () => {
    const code = session.data?.room.code; if (!code) return;
    const label = text => { $('copy-code').textContent = text; window.setTimeout(() => { $('copy-code').textContent = 'Copy code'; }, 1500); };
    (navigator.clipboard?.writeText(code) ?? Promise.reject()).then(() => label('Copied'), () => label('Copy failed'));
  });
  function connect(code) {
    stopLocation();
    const result = session.connect($('nickname').value, code);
    render();
    result.then(joined => { if (joined) { switching = false; entryMode = 'home'; $('room-code').value = ''; } render(); });
  }
  function chooseEntry(mode) {
    // Signed-in players already have a name, so creating needs no further input.
    if (mode === 'create' && session.account) { connect(''); return; }
    entryMode = mode; render();
    $(session.account || mode === 'join' ? 'room-code' : 'nickname').focus?.();
  }
  if (session.connect) {
    listen('show-create', 'click', () => chooseEntry('create'));
    listen('show-join', 'click', () => chooseEntry('join'));
    listen('entry-cancel', 'click', () => { entryMode = 'home'; session.lastError = ''; render(); });
    listen('entry-back', 'click', () => { switching = false; entryMode = 'home'; closeSheet(); });
    listen('switch-room', 'click', () => { switching = true; entryMode = 'home'; closeSheet(); });
    listen('entry-form', 'submit', event => {
      event.preventDefault();
      if (!$('entry-form').reportValidity()) return;
      connect(entryMode === 'join' ? $('room-code').value.trim().toUpperCase() : '');
    });
    session.resume().then(() => { booted = true; render(); });
  }
  if (session.authenticate) {
    const authenticate = async action => {
      if (!$('account-form').reportValidity()) return;
      stopLocation();
      const pending = session.authenticate(action, $('username').value, $('password').value);
      $('password').value = ''; render();
      if (await pending) { switching = false; entryMode = 'home'; setSheet(''); }
      render();
    };
    const logout = async () => {
      stopLocation(); setSheet('');
      const pending = session.logout(); render();
      await pending; switching = false; entryMode = 'home'; render();
    };
    listen('account-form', 'submit', event => { event.preventDefault(); authenticate('login'); });
    listen('register', 'click', () => authenticate('register'));
    listen('logout', 'click', logout);
    listen('open-account', 'click', () => { if (session.account) logout(); else openSheet('account'); });
    listen('open-account-menu', 'click', () => openSheet('account'));
  }
  $('environment').textContent = secure() ? '' : 'Open the trusted HTTPS address to sign in and use location or camera.';
  $('environment').hidden = secure();
  timer = window.setInterval(render, 500); render();
  return { session, render, exportReport };
}

if (typeof document !== 'undefined') mountTreasureLab({ document, window, navigator });
