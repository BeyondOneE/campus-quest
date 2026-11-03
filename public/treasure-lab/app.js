import { RemoteTreasureSession } from './client.js';

export function mountTreasureLab({ document, window, navigator, now = () => Date.now(), session = new RemoteTreasureSession({ now }) }) {
  const $ = id => document.getElementById(id);
  const createdAt = new Date(now()).toISOString();
  const video = $('camera');
  let watch = null, locationToken = 0, stream = null, cameraToken = 0, frameCallback = null;
  let cameraPending = false, cameraError = null, cameraSettings = null;
  let frames = 0, lastFrameAt = null, lastVideoTime = -1, timer = null;
  let locationError = '', cameraMessage = 'Leave the area and return to unlock the treasure.', nextPoll = 0, collecting = false;
  const settle = (result, done) => result && typeof result.then === 'function' ? result.then(done).catch(() => { render(); }) : done(result);
  const listen = (id, event, fn) => $(id).addEventListener(event, fn);
  const badge = (id, text, tone = '') => { $(id).textContent = text; $(id).dataset.tone = tone; };
  const secure = () => window.isSecureContext === true;
  const cameraLive = () => Boolean(stream && !document.hidden && !video.paused && frames > 0
    && lastFrameAt !== null && now() - lastFrameAt < 2500);
  function stopCamera(reason = 'Camera closed.') {
    cameraToken += 1; cameraPending = false;
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
    stopCamera('Location stopped and camera released. Restart manually when ready.');
    render();
  }
  function startLocation() {
    if (!secure() || document.hidden || session.connected === false) return;
    stopLocation(); locationError = '';
    if (!navigator.geolocation) { locationError = 'Location is unavailable in this browser. Use iPhone Safari.'; render(); return; }
    const token = locationToken; session.start(now());
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
        session.fix = null; session.clearDwell();
        if (session.connected !== undefined) session.stop(now());
        if (session.phase === 'ready') session.phase = 'return';
        session.log(`location-error:${error.code}`, now());
        if (error.code === 1) stopLocation(reasons[1]);
        else { locationError = reasons[error.code] || 'Location failed. Please retry.'; stopCamera('Location is unavailable. Wait for a fresh reading, then reopen the camera.'); render(); }
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
    if (!secure() || document.hidden || !session.snapshot(now()).eligible) return;
    if (!navigator.mediaDevices?.getUserMedia) { cameraMessage = 'Camera is unavailable. Open a trusted HTTPS address.'; render(); return; }
    stopCamera(); const token = cameraToken; cameraPending = true; cameraError = null;
    frames = 0; lastFrameAt = null; cameraSettings = null; lastVideoTime = -1;
    cameraMessage = 'Waiting for camera permission. Please allow the rear camera.'; render();
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' },
        width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (token !== cameraToken || document.hidden || !session.snapshot(now()).eligible) {
        acquired.getTracks().forEach(track => track.stop());
        if (token === cameraToken) { cameraPending = false; cameraMessage = 'Location changed. Confirm you are still within treasure range.'; render(); }
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
      cameraMessage = 'Waiting for live video. Tap the chest when it appears.';
      session.log('camera-started', now()); render();
    } catch (error) {
      if (token !== cameraToken) return;
      stopCamera(); cameraError = error.name || 'Error';
      cameraMessage = error.name === 'NotAllowedError' ? 'Camera permission denied. Check Safari website settings, then retry.'
        : 'Camera could not start. Close other apps using it, then retry.';
      session.log(`camera-error:${cameraError}`, now()); render();
    }
  }
  function render() {
    if (watch !== null && session.active === false) { stopLocation('Session changed. Restart location manually.'); return; }
    if (session.refresh && !document.hidden && now() >= nextPoll) {
      nextPoll = now() + 2000; session.refresh().then(() => render());
    }
    if (stream && typeof video.requestVideoFrameCallback !== 'function'
      && !video.paused && video.readyState >= 2 && video.currentTime > lastVideoTime) {
      lastVideoTime = video.currentTime; frameArrived(cameraToken);
    }
    const reading = session.snapshot(now());
    if ((stream || cameraPending) && !reading.eligible) stopCamera('Location no longer meets collection conditions. Camera closed; reopen it near the treasure.');
    const live = cameraLive(), collected = session.phase === 'collected';
    const names = { stopped: 'Stopped', waiting: 'Waiting', stale: 'Reading expired', imprecise: 'Low accuracy',
      unplaced: 'Ready to place', inside: 'In range', outside: 'Outside', boundary: 'At boundary' };
    badge('location-status', names[reading.kind], ['inside','unplaced'].includes(reading.kind) ? 'good' : 'warn');
    const descriptions = { stopped: 'Start location and confirm permission on your phone.', waiting: 'Waiting for live location. Keep this page in the foreground.',
      stale: 'The position has expired. Waiting for a fresh reading.', imprecise: 'Reported accuracy exceeds 20 m. Entry and exit checks are paused; wait in an open area.',
      unplaced: 'A valid position is available. You can place the treasure here.', inside: 'Near the treasure centre. Checking entry conditions.',
      outside: 'Outside treasure range.', boundary: 'Near the boundary. Collection is paused; move farther out or closer to the centre.' };
    $('location-message').textContent = session.lastError || locationError || descriptions[reading.kind];
    $('distance').textContent = reading.distance === null ? '—' : `${Math.round(reading.distance)} m`;
    $('accuracy').textContent = session.fix ? `±${Math.round(session.fix.accuracy)} m` : '—';
    $('age').textContent = session.fix ? `${Math.max(0, Math.floor((now() - session.fix.timestamp) / 1000))} s` : '—';
    const tracking = session.active ?? session.tracking;
    $('start-location').disabled = !secure() || tracking || session.connected === false;
    $('stop-location').disabled = !tracking;
    $('place').disabled = !reading.canPlace;
    $('place').textContent = session.zone ? 'Re-place shared treasure (new round)' : 'Place shared treasure here';
    if ($('connection-status')) {
      const data = session.data;
      $('connection-status').textContent = session.connected ? `${session.online ? 'Connected' : 'Reconnecting'} · ${data.player.name} · ${data.player.role}` : session.account ? 'Create a room or join using a session code' : 'Sign in, or create or join as a guest';
      $('room-status').textContent = data ? `Session ${data.room.code} · ${data.room.playerCount} player(s) · ${data.room.policy}` : 'All devices must use this same website and session code.';
      $('players').textContent = data ? data.players.map(p => `${p.name}${p.collected ? ' — collected' : ''}`).join(' · ') : '';
      $('connection-error').textContent = session.lastError || '';
      $('create-room').disabled = session.busy || tracking || Boolean(stream) || cameraPending;
      $('join-room').disabled = session.busy || tracking || Boolean(stream) || cameraPending;
      $('nickname').disabled = tracking || Boolean(session.account); $('room-code').disabled = tracking || session.busy;
      if (session.account) $('nickname').value = session.account.username;
    }
    if ($('account-status') && session.authenticate) {
      $('account-status').textContent = session.account ? `Signed in as ${session.account.username}` : 'Guest mode · Sign in to save your identity';
      $('account-form').hidden = Boolean(session.account); $('logout').hidden = !session.account;
      for (const id of ['login','register','logout','username','password']) $(id).disabled = session.busy || !secure();
      $('account-rooms').textContent = session.accountRooms?.length ? `Your rooms: ${session.accountRooms.map(r => `${r.code} (${r.role})`).join(' · ')}. Enter a code below to return.` : '';
      $('account-error').textContent = session.lastError || (!secure() ? 'Use trusted HTTPS before entering a password.' : '');
    }
    const journeys = { unplaced: 'No treasure point yet.', leave: 'Treasure placed. Walk outside the range first; the page will tell you when to return.',
      return: reading.kind === 'inside' ? 'Back near the treasure. Waiting for two fresh readings spanning at least 2 seconds.' : 'Departure confirmed. Return to the point where you placed the treasure.',
      ready: reading.eligible ? 'Treasure unlocked. Open the camera to find and collect it.' : 'Previously unlocked, but location is currently unsuitable. Wait for a better reading or approach the centre.',
      collected: 'Treasure collected. Export the report or re-place using live location for another attempt.' };
    $('journey-message').textContent = journeys[session.phase];
    const stages = ['unplaced','leave','return','ready','collected'].indexOf(session.phase);
    ['step-place','step-leave','step-return','step-collect'].forEach((id, index) => {
      $(id).className = index < stages ? 'done' : index === stages ? 'current' : '';
      if (index === Math.min(stages, 3)) $(id).setAttribute('aria-current', 'step');
      else $(id).removeAttribute('aria-current');
    });
    $('start-camera').disabled = !reading.eligible || cameraPending || Boolean(stream);
    $('stop-camera').disabled = !stream && !cameraPending;
    $('camera-placeholder').hidden = live || collected;
    $('treasure').hidden = !live || !reading.eligible; $('treasure').disabled = !live || !reading.eligible || collecting;
    $('collected').hidden = !collected;
    badge('camera-status', collected ? 'Collected' : live ? 'Live video' : cameraPending ? 'Permission pending' : stream ? 'Awaiting video' : reading.eligible ? 'Ready' : 'Locked', live || collected ? 'good' : '');
    $('camera-message').textContent = collected ? 'Collected and camera released. The computer backend saved your collection.'
      : !$('retry-playback').hidden ? 'Tap Resume video. Collection requires a live video update.' : cameraMessage;
  }
  listen('start-location', 'click', startLocation);
  listen('stop-location', 'click', () => stopLocation());
  listen('place', 'click', () => {
    settle(session.place(Number($('radius').value), now()), success => {
      if (success) { stopCamera('Treasure re-placed. Leave and return before opening the camera.'); locationError = ''; }
      else locationError = session.lastError || 'Wait for a valid position and use a radius between 15 and 100 m.';
      render();
    });
    render();
  });
  listen('start-camera', 'click', startCamera);
  listen('stop-camera', 'click', () => { stopCamera(); session.log('camera-stopped', now()); render(); });
  listen('retry-playback', 'click', async () => {
    if (!stream || document.hidden || !session.snapshot(now()).eligible) return;
    try { await video.play(); $('retry-playback').hidden = true; } catch { cameraMessage = 'Playback is still blocked. Close and reopen the camera.'; }
    render();
  });
  listen('treasure', 'click', () => {
    if (cameraLive() && !collecting) {
      collecting = true;
      settle(session.collect(now()), success => { collecting = false; if (success) stopCamera('Collection saved by the server.'); render(); });
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
    if (document.hidden) pause('Capture stopped in the background. Restart location manually on return.');
    else { if (timer === null) timer = window.setInterval(render, 500); render(); }
  });
  window.addEventListener('pagehide', () => pause('Capture stopped when leaving. Restart location manually on return.'));
  window.addEventListener('pageshow', () => { if (!document.hidden && timer === null) timer = window.setInterval(render, 500); render(); });
  if (session.connect) {
    const connect = code => {
      stopLocation();
      const result = session.connect($('nickname').value, code);
      render(); result.then(() => render());
    };
    listen('create-room', 'click', () => connect(''));
    listen('join-room', 'click', () => connect($('room-code').value.trim().toUpperCase()));
    session.resume().then(() => render());
  }
  if (session.authenticate) {
    const authenticate = async action => {
      if (!$('account-form').reportValidity()) return;
      stopLocation();
      const pending = session.authenticate(action, $('username').value, $('password').value);
      $('password').value = ''; render(); await pending; render();
    };
    listen('account-form', 'submit', event => { event.preventDefault(); authenticate('login'); });
    listen('register', 'click', () => authenticate('register'));
    listen('logout', 'click', async () => { stopLocation(); const pending = session.logout(); render(); await pending; render(); });
  }
  $('environment').textContent = secure() ? 'Computer backend · Start location to share positions for range checks; video stays on this phone.'
    : 'Use a trusted HTTPS address. LAN HTTP supports layout preview only.';
  timer = window.setInterval(render, 500); render();
  return { session, render, exportReport };
}

if (typeof document !== 'undefined') mountTreasureLab({ document, window, navigator });
