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
  h.advance(1000); h.fix({ north: 29 }); assert.equal(h.node('start-camera').disabled, false, 'boundary still permits direction guidance');
  assert.equal(h.session.snapshot(1800000008000).canClaim, false);
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
  await h.click('start-camera'); h.click('claim'); assert.equal(h.session.collectionCount, 0);
  h.frame(); h.direction(); assert.equal(h.node('treasure').hidden, false);
  assert.equal(h.node('claim').disabled, true); h.aimAtTreasure();
  h.click('claim'); h.click('claim');
  assert.equal(h.session.collectionCount, 1); assert.equal(h.session.phase, 'collected');
  assert.equal(stream.stops, 1); assert.equal(h.node('camera').srcObject, null);
  assert.equal(h.node('collected').hidden, false);
});

test('camera paints the newest chest projection on successive frames without refreshing the field', async () => {
  const h = harness({ getUserMedia: async () => cameraStream(), frameCallbacks: true, animationFrames: true });
  Object.assign(h.node('screen-camera'), { clientWidth: 360, clientHeight: 640 });
  h.unlock();
  await h.click('start-camera');
  const chest = h.node('treasure');

  h.frame(false);
  h.direction({}, false);
  assert.equal(h.paintCallbacks.size, 1, 'video and orientation share one paint');
  assert.equal(chest.hidden, true);
  h.paint();
  assert.equal(chest.hidden, false);
  assert.equal(h.node('camera-placeholder').hidden, true);
  assert.ok(Math.abs(parseFloat(chest.style['--target-x'])) < .01);

  let fieldUpdates = 0;
  h.node('gauge-arc').setAttribute = () => { fieldUpdates++; };
  const expectOffset = turn => {
    const expected = -180 * Math.tan(turn * Math.PI / 180) / Math.tan(Math.PI / 6);
    assert.ok(Math.abs(parseFloat(chest.style['--target-x']) - expected) < .02);
  };
  h.advance(16, false);
  h.direction({ heading: 52 }, false);
  h.direction({ heading: 60 }, false);
  assert.equal(h.paintCallbacks.size, 1);
  h.paint();
  expectOffset(15);
  h.advance(16, false);
  h.direction({ heading: 65 }, false);
  h.paint();
  expectOffset(20);
  assert.equal(fieldUpdates, 0);
  assert.equal(h.node('claim').disabled, true);

  h.frame(false);
  const [latePaint] = h.paintCallbacks.values();
  h.background();
  assert.equal(h.paintCallbacks.size, 0);
  latePaint();
  assert.equal(chest.hidden, true);
});

test('the camera shows one aim instruction and keeps the saving action visible until the claim responds', async () => {
  const stream = cameraStream(), h = harness({ getUserMedia: () => Promise.resolve(stream) });
  h.unlock();
  await h.click('start-camera');
  h.frame(); h.direction();
  assert.match(h.node('ar-message').textContent, /Point the camera at the chest/);
  assert.equal(h.node('camera-message').hidden, true);
  h.advance(450); h.frame(); h.direction();
  assert.match(h.node('ar-message').textContent, /Keep the camera on the chest/);
  assert.ok(parseFloat(h.node('aim-reticle').style['--aim-progress']) > 0);
  h.aimAtTreasure();
  assert.equal(h.node('ar-message').textContent, 'Tap Claim treasure.');

  const { session } = h;
  const snapshot = session.snapshot.bind(session);
  session.snapshot = now => session.busy ? { ...snapshot(now), eligible: false, canClaim: false } : snapshot(now);
  let reply;
  session.collect = () => {
    session.busy = true;
    return new Promise(resolve => { reply = resolve; });
  };
  h.click('claim');
  assert.equal(h.node('claim').hidden, false);
  assert.equal(h.node('claim').disabled, true);
  assert.equal(h.node('claim').textContent, 'Saving claim…');
  assert.equal(h.node('ar-message').hidden, true);

  session.busy = false;
  session.lastError = 'The server did not save the claim. Try again.';
  reply(false);
  await Promise.resolve();
  assert.match(h.node('camera-message').textContent, /Try again/);
  assert.equal(h.node('app').dataset.screen, 'camera');
  assert.equal(stream.stops, 0);
  h.aimAtTreasure();
  assert.equal(h.node('claim').disabled, false);
});

test('expired GPS retains a locked local search and permits fresh motion aiming', async () => {
  const stream = cameraStream(), h = harness({ getUserMedia: () => Promise.resolve(stream) }); h.unlock();
  await h.click('start-camera'); h.frame(); h.advance(16000); h.frame(); h.click('claim');
  assert.equal(h.session.collectionCount, 0); assert.equal(stream.stops, 0);
  assert.equal(h.node('camera').srcObject,stream);assert.equal(h.node('app').dataset.screen,'camera');
  assert.equal(h.node('gps-spinner').hidden,true);
  assert.equal(h.session.snapshot(1800000020000).eligible,true);assert.equal(h.geoRequests,2);
  h.fix();h.frame();h.direction();assert.equal(h.node('gps-spinner').hidden,true);
  assert.equal(h.node('claim').disabled,true);h.aimAtTreasure();assert.equal(h.node('claim').disabled,false);
  assert.equal(h.cameraRequests,1);
});

test('stalled video blocks collection even with recent location', async () => {
  const h = harness({ getUserMedia: () => Promise.resolve(cameraStream()), frameCallbacks: true }); h.unlock();
  await h.click('start-camera'); h.frame(); h.advance(3000); h.fix(); h.click('claim');
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
  await h.click('retry-playback'); h.frame(); h.direction(); assert.equal(h.node('treasure').hidden, false);
});

test('transient GPS errors retain capture and recover; permission revocation releases it', async () => {
  const stream = cameraStream(), h = harness({ getUserMedia: () => Promise.resolve(stream) }); h.unlock();
  await h.click('start-camera'); h.frame(); h.geoError(3); h.click('claim');
  assert.equal(h.session.collectionCount, 0); assert.equal(stream.stops, 0);
  assert.equal(h.node('claim').disabled,true);assert.equal(h.node('gps-spinner').hidden,true);
  assert.equal(h.node('camera').srcObject,stream);
  h.advance(100);h.fix();h.advance(2000);h.fix();h.frame();h.direction();
  assert.equal(h.node('gps-spinner').hidden,true);assert.equal(h.cameraRequests,1);
  h.geoError(1);assert.equal(stream.stops,1); assert.equal(h.session.tracking, false); assert.equal(h.node('start-location').disabled, false);
});

test('callbacks after stopping location cannot update state; re-placement resets collection', async () => {
  const h = harness({ getUserMedia: () => Promise.resolve(cameraStream()) }); h.unlock();
  await h.click('start-camera'); h.frame(); h.aimAtTreasure(); h.click('claim');
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

test('the page shows one screen and offers only the next action for the current state', async () => {
  const stream = cameraStream(); let grant;
  const h = harness({ getUserMedia: () => new Promise(resolve => { grant = () => resolve(stream); }) });
  const visible = () => ['start-location', 'place-panel', 'start-camera', 'rehide'].filter(id => !h.node(id).hidden);
  assert.equal(h.node('app').dataset.screen, 'field'); assert.deepEqual(visible(), ['start-location']);
  h.click('start-location'); h.fix(); assert.deepEqual(visible(), ['place-panel']);
  h.click('place'); assert.deepEqual(visible(), []); assert.equal(h.node('headline').textContent, 'Walk away');
  h.advance(1000); h.fix({ north: 65 }); assert.equal(h.node('headline').textContent, 'Head back');
  h.advance(1000); h.fix(); h.advance(2000); h.fix(); assert.deepEqual(visible(), ['start-camera']);
  const opening = h.click('start-camera'); assert.equal(h.node('app').dataset.screen, 'camera');
  assert.equal(h.node('screen-field').hidden, true); assert.equal(h.node('screen-camera').hidden, false);
  grant(); await opening; h.frame(); h.direction(); assert.equal(h.node('treasure').hidden, false);
  h.aimAtTreasure(); h.click('claim'); assert.equal(h.node('app').dataset.screen, 'field');
  assert.equal(h.node('collected').hidden, false); assert.deepEqual(visible(), ['rehide']);
  h.click('rehide'); assert.equal(h.node('collected').hidden, true); assert.deepEqual(visible(), ['place-panel']);
  h.click('place-cancel'); assert.equal(h.node('collected').hidden, false);
});

test('opening a sheet moves focus without scrolling the page underneath', () => {
  const h = harness(); let options;
  h.node('sheet-menu').focus = value => { options = value; };
  h.click('open-menu');
  assert.equal(h.node('sheet-menu').hidden, false);
  assert.deepEqual(options, { preventScroll: true });
});

test('test tools group live GPS readings, the placement setting, and field notes', () => {
  const h = harness();
  h.click('start-location'); h.fix({ accuracy: 6 });
  h.click('open-menu'); h.click('open-tools');
  assert.equal(h.node('sheet-menu').hidden, true);
  assert.equal(h.node('sheet-tools').hidden, false);
  assert.equal(h.node('readouts').hidden, false);
  assert.equal(h.node('indoor-readouts').hidden, true);
  assert.equal(h.node('accuracy').textContent, '±6 m');
  h.advance(2000);
  assert.equal(h.node('age').textContent, '2 s ago');
  h.node('radius').value = '42';
  h.node('radius').input();
  assert.equal(h.node('radius-value').textContent, '42 m');

  h.click('open-notes');
  assert.equal(h.node('sheet-tools').hidden, true);
  assert.equal(h.node('sheet-notes').hidden, false);
  h.click('notes-back');
  assert.equal(h.node('sheet-notes').hidden, true);
  assert.equal(h.node('sheet-tools').hidden, false);
  h.click('tools-back');
  assert.equal(h.node('sheet-menu').hidden, false);
  h.click('scrim'); h.click('place');
  assert.equal(h.session.zone.radius, 42);
});

test('canceling a mode change keeps the treasure and location active until the host confirms', async () => {
  const h = harness();
  h.click('start-location'); h.fix(); h.click('place'); h.click('open-menu');
  const chest = h.session.zone;
  let cancelFocused = false;
  h.node('mode-cancel').focus = () => { cancelFocused = true; };
  h.click('mode-ronin');
  assert.equal(h.node('mode-confirm').hidden, false);
  assert.equal(h.node('mode-question').textContent, 'Switch to Indoor?');
  assert.equal(cancelFocused, true);
  assert.equal(h.session.zone, chest);
  h.click('mode-cancel');
  assert.equal(h.node('mode-confirm').hidden, true);
  assert.equal(h.node('sheet-menu').hidden, false);
  assert.equal(h.session.tracking, true);
  assert.equal(h.session.zone, chest);
  assert.deepEqual(h.cleared, []);

  h.click('mode-ronin');
  await h.click('mode-apply');
  assert.equal(h.node('mode-confirm').hidden, true);
  assert.equal(h.node('sheet-menu').hidden, true);
  assert.equal(h.session.mode, 'indoor-ronin');
  assert.equal(h.session.zone, null);
  assert.equal(h.session.tracking, false);
});

test('the join form rejects malformed room codes and submits a normalized pasted code', async () => {
  const session = new TreasureSession(), attempts = [];
  session.resume = async () => {};
  session.connect = async (name, code) => { attempts.push({ name, code }); return true; };
  const h = harness({ session });
  await Promise.resolve();
  h.click('show-join');
  const code = h.node('room-code'), form = h.node('entry-form');
  form.reportValidity = () => true;
  const submit = () => form.submit({ preventDefault() {} });
  h.node('nickname').value = 'Guest';

  code.value = 'ABC2DEFGX';
  submit();
  assert.deepEqual(attempts, []);
  assert.equal(code.attrs['aria-invalid'], 'true');
  assert.equal(h.node('room-code-error').hidden, false);
  code.value = '  01- 23  ';
  code.input();
  assert.equal(h.node('room-code-error').hidden, true);
  submit();
  await Promise.resolve();
  h.click('show-join');
  code.value = '  abc2-de  fg  ';
  submit();
  assert.deepEqual(attempts, [{ name: 'Guest', code: '0123' }, { name: 'Guest', code: 'ABC2DEFG' }]);
});
