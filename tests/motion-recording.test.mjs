import test from 'node:test';
import assert from 'node:assert/strict';
import { mountMotionRecorder, trialMarks } from '../public/treasure-lab/motion-recording.js';
import { replayMotion } from '../scripts/replay-motion.mjs';
import { backendHarness } from './helpers/backend-harness.mjs';

function recorder(permission = async () => 'granted') {
  let time = 400, downloaded = null, file = null;
  const timeOrigin = 1800000000000;
  const nodes = new Map(), listeners = new Map(), documentListeners = new Map();
  const node = key => {
    if (!nodes.has(key)) nodes.set(key, {
      value: key === 'trial' ? 'shake' : '2',
      addEventListener(name, fn) { this[name] = fn; },
    });
    return nodes.get(key);
  };
  const document = {
    hidden: false, getElementById: id => node(id.slice(7)), body: { append() {} },
    addEventListener: (name, fn) => documentListeners.set(name, fn),
    createElement: () => ({ click() { file = this.download; }, remove() {} }),
  };
  const window = {
    isSecureContext: true, performance: { now: () => time, timeOrigin },
    DeviceMotionEvent: { requestPermission: permission },
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name),
    setTimeout: () => 1, clearTimeout() {},
    URL: { createObjectURL(blob) { downloaded = blob; return 'blob:recording'; }, revokeObjectURL() {} },
  };
  mountMotionRecorder(document, window);
  return {
    node, click: key => node(key).click(), get downloaded() { return downloaded; }, get file() { return file; },
    get listening() { return listeners.has('devicemotion'); },
    emit(ms, overrides = {}) {
      for (let step = 0; step < ms; step += 20) {
        time += 20;
        listeners.get('devicemotion')?.({
          timeStamp: timeOrigin + time - 1, interval: 20, acceleration: { x: 0, y: 0, z: 0 },
          accelerationIncludingGravity: { x: 0, y: 9.80665, z: 0 },
          rotationRate: { alpha: 0, beta: 0, gamma: 0 }, ...overrides,
        });
      }
    },
    hide() { document.hidden = true; documentListeners.get('visibilitychange')(); },
  };
}

test('recorded shake trial exports marked raw samples and replays in the shared gravity-aligned frame', async () => {
  const h = recorder();
  await h.click('start');
  assert.equal(h.node('mark').disabled, true);
  h.emit(2300);
  h.click('mark');
  h.emit(600, { rotationRate: { alpha: 0, beta: 0, gamma: 20 } });
  h.click('mark');
  h.emit(3300);
  h.click('mark');
  assert.equal(h.node('stop').disabled, true);
  h.emit(1200);
  assert.equal(h.node('stop').disabled, false);
  h.click('stop');
  assert.equal(h.listening, false);
  h.click('export');
  assert.match(h.file, /^campus-quest-motion-shake-/);
  const data = JSON.parse(await h.downloaded.text());
  assert.equal(data.completeTrial, true);
  assert.deepEqual(data.marks.map(({ id, phase }) => [id, phase]), [
    ['start', 'start'], ['shake-end', 'moving'], ['settled', 'settled'],
  ]);
  assert.equal(data.samples[0].sampleMs, 19);
  assert.equal(data.samples[0].receivedMs, 20);
  assert.equal(data.completeSamples, data.samples.length);
  const replay = replayMotion(data);
  assert.ok(replay.trace.length > 300);
  assert.ok(replay.trace.every(row => Math.hypot(row.x, row.y) < 1e-8));
  assert.ok(Math.abs(replay.trace[0].features[5] - 9.80665) < 1e-8);
  assert.ok(replay.trace.some(row => Math.abs(row.features[2] - 20 * Math.PI / 180) < 1e-8));
});

test('foreground loss cancels late permission and saves a partial recording with missing channels', async () => {
  let grant;
  const pending = recorder(() => new Promise(resolve => { grant = resolve; }));
  const opening = pending.click('start');
  pending.hide();
  grant('granted');
  await opening;
  assert.equal(pending.listening, false);
  assert.equal(pending.node('export').disabled, true);

  const h = recorder();
  await h.click('start');
  h.emit(60, { acceleration: null });
  h.hide();
  assert.equal(h.listening, false);
  h.click('export');
  const data = JSON.parse(await h.downloaded.text());
  assert.equal(data.stopReason, 'background');
  assert.equal(data.completeTrial, false);
  assert.equal(data.completeSamples, 0);
  assert.deepEqual(data.samples[0].acceleration, { x: null, y: null, z: null });
  assert.throws(() => replayMotion(data), /full trial/i);
});

test('measured walks record moving and settled references and the recorder is served without data connections', () => {
  const points = trialMarks('walk', 3);
  assert.deepEqual(points.map(({ phase, y }) => [phase, y]), [
    ['start', 0], ['moving', 1.5], ['moving', 3], ['settled', 3], ['moving', 1.5], ['moving', 0], ['settled', 0],
  ]);
  const h = backendHarness();
  try {
    const page = h.handle({ method: 'GET', path: '/treasure-lab/motion-recording.html' });
    assert.equal(page.status, 200);
    assert.match(page.headers['Content-Security-Policy'], /connect-src 'none'/);
    assert.match(page.headers['Permissions-Policy'], /geolocation=\(\)/);
    assert.match(String(h.handle({ method: 'GET', path: '/treasure-lab/' }).body), /href="\.\/motion-recording\.html"/);
    assert.equal(h.handle({ method: 'GET', path: '/treasure-lab/motion-recording.js' }).status, 200);
  } finally {
    h.store.close();
  }
});
