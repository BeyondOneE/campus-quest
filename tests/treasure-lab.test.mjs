import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classify, distanceMeters, TreasureSession } from '../public/treasure-lab/model.js';
import { harness, cameraStream } from './helpers/treasure-harness.mjs';

test('distance handles the international date line; invalid, stale and imprecise fixes cannot place or unlock', () => {
  assert.ok(distanceMeters({ latitude: 0, longitude: 179.999 }, { latitude: 0, longitude: -179.999 }) < 225);
  const s = new TreasureSession(); s.start(100000);
  const base = { latitude: 0, longitude: 0, accuracy: 5, timestamp: 100000 };
  for (const fix of [{ ...base, latitude: null }, { ...base, longitude: 181 }, { ...base, accuracy: -1 }]) {
    assert.equal(s.receive(fix, 100000), false);
  }
  assert.equal(s.receive({ ...base, timestamp: 999999 }, 100000), false, 'future timestamps must not poison later samples');
  s.receive({ ...base, accuracy: 100 }, 100000); assert.equal(s.place(30, 100000), false);
  s.receive({ ...base, timestamp: 100001 }, 100001); assert.equal(s.place(30, 120000), false);
  assert.equal(classify(base, null, 120000).kind, 'stale');
});

test('placement requires live data; exit, stable return and uncertainty gates precede collection', () => {
  const h = harness();
  assert.equal(h.session.place(30, 1800000000000), false);
  h.click('start-location'); h.fix(); h.click('place');
  assert.equal(h.session.phase, 'leave');
  h.advance(3000); h.fix(); assert.equal(h.session.snapshot(1800000003000).eligible, false);
  h.advance(1000); h.fix({ north: 42 }); assert.equal(h.session.phase, 'leave', 'uncertainty overlaps the exit boundary');
  h.advance(1000); h.fix({ north: 65 }); assert.equal(h.session.phase, 'return');
  h.advance(1000); h.fix(); assert.equal(h.session.phase, 'return');
  h.advance(2000); h.fix(); assert.equal(h.session.phase, 'ready');
  h.advance(1000); h.fix({ north: 29 }); assert.equal(h.node('start-camera').disabled, true, 'boundary cannot collect');
});

test('duplicate samples, interrupted dwell and stale samples cannot complete a return', () => {
  const h = harness(); h.click('start-location'); h.fix(); h.click('place');
  h.advance(1000); h.fix({ north: 65 }); h.advance(1000); h.fix();
  h.fix(); h.advance(2100); assert.equal(h.session.phase, 'return');
  h.fix({ accuracy: 100 }); h.advance(1000); h.fix(); assert.equal(h.session.phase, 'return');
  h.advance(16000); h.fix(); assert.equal(h.session.phase, 'return', 'long sample gap resets dwell');
  h.advance(2000); h.fix(); assert.equal(h.session.phase, 'ready');
});

test('camera permission and a stream alone cannot collect; live frames can collect exactly once', async () => {
  const stream = cameraStream(), h = harness({ getUserMedia: () => Promise.resolve(stream) }); h.unlock();
  await h.click('start-camera'); h.click('treasure'); assert.equal(h.session.collectionCount, 0);
  h.frame(); assert.equal(h.node('treasure').hidden, false);
  h.click('treasure'); h.click('treasure');
  assert.equal(h.session.collectionCount, 1); assert.equal(h.session.phase, 'collected');
  assert.equal(stream.stops, 1); assert.equal(h.node('camera').srcObject, null);
  assert.equal(h.node('collected').hidden, false);
});

test('expired location closes an active camera and blocks collection', async () => {
  const stream = cameraStream(), h = harness({ getUserMedia: () => Promise.resolve(stream) }); h.unlock();
  await h.click('start-camera'); h.frame(); h.advance(16000); h.click('treasure');
  assert.equal(h.session.collectionCount, 0); assert.equal(stream.stops, 1);
  assert.equal(h.node('start-camera').disabled, true);
});

test('stalled video blocks collection even with recent location', async () => {
  const h = harness({ getUserMedia: () => Promise.resolve(cameraStream()), frameCallbacks: true }); h.unlock();
  await h.click('start-camera'); h.frame(); h.advance(3000); h.fix(); h.click('treasure');
  assert.equal(h.session.collectionCount, 0); assert.equal(h.node('treasure').hidden, true);
});

test('background cancels pending camera acquisition, releases late streams and clears watch ID zero', async () => {
  let resolve; const stream = cameraStream(), h = harness({ getUserMedia: () => new Promise(r => { resolve = r; }) }); h.unlock();
  const pending = h.click('start-camera'); h.background(); resolve(stream); await pending;
  assert.equal(stream.stops, 1); assert.ok(h.cleared.includes(0));
  const requests = h.geoRequests; h.foreground();
  assert.equal(h.geoRequests, requests); assert.equal(h.session.tracking, false);
  assert.equal(h.node('start-camera').disabled, true);
});

test('camera denial and blocked playback allow retry without claiming success', async () => {
  const stream = cameraStream(); let attempts = 0;
  const h = harness({ getUserMedia: () => ++attempts === 1 ? Promise.reject({ name: 'NotAllowedError' }) : Promise.resolve(stream) }); h.unlock();
  await h.click('start-camera'); assert.equal(h.node('start-camera').disabled, false);
  assert.equal(h.node('treasure').hidden, true);
  h.node('camera').play = () => Promise.reject({ name: 'NotAllowedError' });
  await h.click('start-camera'); assert.equal(h.node('retry-playback').hidden, false);
  assert.equal(h.node('treasure').hidden, true);
  h.node('camera').play = function () { this.paused = false; return Promise.resolve(); };
  await h.click('retry-playback'); h.frame(); assert.equal(h.node('treasure').hidden, false);
});

test('location errors invalidate a recently eligible fix and cancel camera work', async () => {
  const stream = cameraStream(), h = harness({ getUserMedia: () => Promise.resolve(stream) }); h.unlock();
  await h.click('start-camera'); h.frame(); h.geoError(3); h.click('treasure');
  assert.equal(h.session.collectionCount, 0); assert.equal(stream.stops, 1);
  assert.equal(h.node('start-camera').disabled, true);
  h.geoError(1); assert.equal(h.session.tracking, false); assert.equal(h.node('start-location').disabled, false);
});

test('callbacks after stopping location cannot update state; re-placement resets collection', async () => {
  const h = harness({ getUserMedia: () => Promise.resolve(cameraStream()) }); h.unlock();
  await h.click('start-camera'); h.frame(); h.click('treasure');
  h.advance(1000); h.fix(); h.click('place');
  assert.equal(h.session.phase, 'leave'); assert.equal(h.session.collectionCount, 0);
  h.click('stop-location'); const count = h.session.samples; h.advance(1000); h.fix();
  assert.equal(h.session.samples, count); assert.equal(h.session.fix, null);
});

test('frame callbacks cancel on background and ended camera tracks never leave a collectible chest', async () => {
  const stream = cameraStream(), h = harness({ getUserMedia: () => Promise.resolve(stream), frameCallbacks: true }); h.unlock();
  await h.click('start-camera'); h.frame(); stream.end();
  assert.equal(h.node('treasure').hidden, true); assert.equal(h.callbacks.size, 0);
  assert.ok(h.cancelledFrames.length > 0);
});

test('non-secure contexts cannot start hardware; automatic reports contain no coordinates', () => {
  const blocked = harness({ secure: false }); blocked.click('start-location'); blocked.click('start-camera');
  assert.equal(blocked.geoRequests, 0); assert.equal(blocked.cameraRequests, 0);
  const h = harness(); h.unlock(); const report = h.exportReport();
  assert.equal(report.includesCoordinates, false); assert.equal(report.treasurePlaced, true);
  const serialized = JSON.stringify(report);
  assert.equal(/latitude|longitude/.test(serialized), false);
  assert.equal(serialized.includes('test-harness-not-physical-evidence'), true);
  const html = readFileSync(new URL('../public/treasure-lab/index.html', import.meta.url), 'utf8');
  for (const id of h.elements.keys()) assert.ok(html.includes(`id="${id}"`), `controller element ${id} exists`);
});
