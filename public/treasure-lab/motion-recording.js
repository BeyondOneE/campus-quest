const maxDurationMs = 120_000;
const maxSamples = 24_000;
const prepare = {
  shake: 'Keep your feet at the starting mark. Move the phone when prompted, then hold it still again.',
  walk: 'Mark the start, halfway point and far end on a straight line. Start upright with the phone facing the far end.',
};

export function trialMarks(trial, distance) {
  const mark = (id, label, phase, y, instruction) => ({ id, label, phase, y, instruction });
  const start = mark('start', 'Mark start', 'start', 0, 'Hold the phone upright and still for two seconds, then mark the start.');
  if (trial === 'shake') return [
    start,
    mark('shake-end', 'Mark end of shake', 'moving', 0, 'Shake the phone while standing in place. Mark when you stop shaking.'),
    mark('settled', 'Mark settled', 'settled', 0, 'Keep the phone still for at least three seconds, then mark settled.'),
  ];
  if (trial !== 'walk' || !Number.isFinite(distance) || distance < .5 || distance > 20) return null;
  return [
    start,
    mark('out-mid', 'Mark halfway out', 'moving', distance / 2, 'Tap as you pass the halfway mark on the way out.'),
    mark('out-arrival', 'Mark arrival', 'moving', distance, 'Tap when you reach the far mark, then stand still.'),
    mark('out-settled', 'Mark far stop', 'settled', distance, 'Hold still for at least three seconds, then mark the far stop.'),
    mark('back-mid', 'Mark halfway back', 'moving', distance / 2, 'Turn around and tap as you pass the halfway mark on the way back.'),
    mark('back-arrival', 'Mark return', 'moving', 0, 'Tap when you reach the start, then stand still.'),
    mark('back-settled', 'Mark final stop', 'settled', 0, 'Hold still for at least three seconds, then mark the final stop.'),
  ];
}

const finite = value => Number.isFinite(value) ? value : null;
const axes = (value, keys) => Object.fromEntries(keys.map(key => [key, finite(value?.[key])]));
const xyz = ['x', 'y', 'z'];
const angles = ['alpha', 'beta', 'gamma'];

export function motionSample(event, start, received, timeOrigin, screenAngle) {
  const stamp = event.timeStamp > 1e12 ? event.timeStamp - timeOrigin : event.timeStamp;
  return {
    sampleMs: Number.isFinite(stamp) && stamp >= start && stamp <= received + 5 ? stamp - start : null,
    receivedMs: received - start,
    intervalMs: finite(event.interval),
    screenAngle: finite(screenAngle) ?? 0,
    acceleration: axes(event.acceleration, xyz),
    accelerationIncludingGravity: axes(event.accelerationIncludingGravity, xyz),
    rotationRate: axes(event.rotationRate, angles),
  };
}

const complete = sample => [sample.acceleration, sample.accelerationIncludingGravity, sample.rotationRate]
  .every(vector => Object.values(vector).every(Number.isFinite));

export function mountMotionRecorder(document, window) {
  const $ = id => document.getElementById(`motion-${id}`);
  const now = () => window.performance.now();
  const message = text => { $('status').textContent = text; };
  let recording = null, plan = null, start = 0, firstComplete = null, lastMark = null;
  let active = false, pending = false, requestId = 0, timer = null, lastRender = -Infinity;

  function render() {
    const trial = $('trial').value;
    const next = active ? plan[recording.marks.length] : null;
    $('setup').hidden = active;
    $('trial').disabled = active || pending;
    $('distance').disabled = active || pending;
    $('distance-field').hidden = trial !== 'walk';
    $('start').hidden = active;
    $('start').disabled = pending;
    $('stop').hidden = !active;
    $('stop').disabled = active && !next && now() - lastMark < 1000;
    $('mark').hidden = !next;
    const readyAt = lastMark === null ? firstComplete + 2000 : lastMark + (next?.phase === 'settled' ? 3000 : 0);
    $('mark').disabled = !next || firstComplete === null || now() < readyAt;
    $('mark').textContent = next?.label ?? 'Mark start';
    $('instructions').textContent = next?.instruction ?? (active ? 'Wait one more second, then stop and export.' : prepare[trial]);
    $('export').disabled = active || pending || !recording?.samples.length;
    $('count').textContent = recording
      ? `${recording.samples.length} samples · ${recording.completeSamples} complete` : '0 samples';
  }

  function stop(reason, text) {
    requestId++;
    pending = false;
    if (active) {
      active = false;
      window.removeEventListener('devicemotion', receive);
      window.clearTimeout(timer);
      recording.stopReason = reason;
      recording.durationMs = now() - start;
      recording.completeTrial = recording.marks.length === plan.length;
      if (!recording.completeSamples) text = 'No complete motion samples. Check Motion & Orientation access in Safari.';
    }
    message(text);
    render();
  }

  function receive(event) {
    if (!active) return;
    const received = now();
    const angle = window.screen?.orientation?.angle ?? window.orientation ?? 0;
    const sample = motionSample(event, start, received, window.performance.timeOrigin, angle);
    recording.samples.push(sample);
    if (complete(sample)) {
      recording.completeSamples++;
      firstComplete ??= received;
    }
    if (recording.samples.length >= maxSamples) {
      stop('sample-limit', 'Sample limit reached. Export the recording.');
    } else if (received - lastRender >= 200) {
      lastRender = received;
      render();
    }
  }

  async function begin() {
    if (active || pending || document.hidden) return;
    const trial = $('trial').value;
    const distance = trial === 'walk' ? Number($('distance').value) : null;
    const nextPlan = trialMarks(trial, distance);
    if (!nextPlan) { message('Enter a one-way distance from 0.5 to 20 metres.'); return; }
    if (!window.isSecureContext || !window.DeviceMotionEvent) {
      message('Open the trusted HTTPS address in Safari to record motion.');
      return;
    }
    pending = true;
    const id = ++requestId;
    render();
    try {
      const api = window.DeviceMotionEvent;
      const permission = typeof api.requestPermission === 'function' ? await api.requestPermission() : 'granted';
      if (id !== requestId || document.hidden) return;
      if (permission !== 'granted') {
        stop('permission-denied', 'Motion access was denied. Allow Motion & Orientation access and retry.');
        return;
      }
      pending = false;
      plan = nextPlan;
      recording = {
        schemaVersion: 1, kind: 'campus-quest-motion-recording', trial, distanceMeters: distance,
        units: { time: 'ms', acceleration: 'm/s²', rotationRate: 'deg/s', referencePosition: 'm' },
        referenceFrame: 'start-right-forward', completeSamples: 0, marks: [], samples: [],
      };
      start = now();
      firstComplete = null;
      lastMark = null;
      lastRender = -Infinity;
      active = true;
      window.addEventListener('devicemotion', receive);
      timer = window.setTimeout(() => stop('time-limit', 'Two-minute limit reached. Export the recording.'), maxDurationMs);
      message('Recording. Keep the phone still until Mark start is available.');
      render();
    } catch {
      if (id === requestId) stop('permission-error', 'Motion access could not start. Check Safari settings and retry.');
    }
  }

  $('start').addEventListener('click', begin);
  $('stop').addEventListener('click', () => stop('manual', 'Recording stopped. Export the JSON file.'));
  $('trial').addEventListener('change', render);
  $('mark').addEventListener('click', () => {
    if (!active || $('mark').disabled) return;
    const next = plan[recording.marks.length];
    const time = now();
    recording.marks.push({ id: next.id, phase: next.phase, tMs: time - start, x: 0, y: next.y });
    lastMark = time;
    message(next.phase === 'settled' ? 'Settled point marked.' : 'Point marked.');
    render();
  });
  $('export').addEventListener('click', () => {
    if (!recording?.samples.length || active || pending) return;
    const data = new Blob([JSON.stringify(recording)], { type: 'application/json' });
    const url = window.URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `campus-quest-motion-${recording.trial}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    message('Export requested. Check Safari Downloads or Files.');
  });
  function interrupt() {
    if (active || pending) stop('background', 'Recording stopped when Safari left the foreground. Export what was recorded.');
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) interrupt(); });
  window.addEventListener('pagehide', interrupt);
  render();
}

if (typeof document !== 'undefined') mountMotionRecorder(document, window);
