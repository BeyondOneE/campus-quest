import test from 'node:test';
import assert from 'node:assert/strict';
import { IndoorRonin, normalizeIosMotion, validRoninBatch } from '../public/treasure-lab/ronin.js';
import { RemoteTreasureSession } from '../public/treasure-lab/client.js';
import { cameraPose, projectTreasure } from '../public/treasure-lab/ar.js';
import { TreasureSession } from '../public/treasure-lab/model.js';
import { backendHarness } from './helpers/backend-harness.mjs';
import { harness, cameraStream } from './helpers/treasure-harness.mjs';

const event = (x = 0) => ({ acceleration: { x, y: 0, z: 0 },
  accelerationIncludingGravity: { x, y: -9.80665, z: 0 }, rotationRate: { alpha: 0, beta: 0, gamma: 0 } });

test('RoNIN maps iPhone axes, requests continuous windows and invalidates a gap', () => {
  const input = { ...event(2), rotationRate: { alpha: 3, beta: 5, gamma: 7 } };
  const mapped = normalizeIosMotion(input);
  assert.deepEqual(mapped.rotationRate, { beta: 3, gamma: 5, alpha: 7 });
  assert.equal(mapped.acceleration.x, -2);
  assert.equal(mapped.accelerationIncludingGravity.y, 9.80665);
  assert.equal(input.accelerationIncludingGravity.y, -9.80665);

  const tracker = new IndoorRonin();
  for (let at = 0; at < 1500; at += 20) tracker.observe(event(), at);
  assert.equal(tracker.batch(), null);
  tracker.observe(event(), 1500);
  const first = tracker.batch();
  assert.equal(first.start, 500);
  assert.equal(first.payload.count, 1);
  assert(validRoninBatch(first.payload));
  assert.equal(tracker.accept(first, [[0, 0]]).stationary, true);
  assert.equal(tracker.accept(first, [[0, 0]]), null);

  for (let at = 1520; at <= 1700; at += 20) tracker.observe(event(1), at);
  const moving = tracker.batch();
  assert.equal(moving.start, 550);
  assert.equal(moving.payload.count, 4);
  assert(validRoninBatch(moving.payload));
  const fix = tracker.accept(moving, Array.from({ length: 4 }, () => [0, .5]));
  assert.equal(fix.stationary, false);
  assert.equal(fix.source, 'ronin-imu');
  assert.equal(fix.y, 0); // These windows are centred before the phone began moving.
  for (let at = 1720; at <= 2100; at += 20) tracker.observe(event(1), at);
  const next = tracker.batch();
  assert(tracker.accept(next, Array.from({ length: next.payload.count }, () => [0, .5])).y > 0);
  assert.match(tracker.observe(event(), 2240).error, /interrupted/);
  assert.equal(tracker.batch(), null);
});

test('RoNIN integrates buffered steps, then zeros biased velocity at rest and resumes walking', () => {
  const tracker = new IndoorRonin();
  let at = 0, fix;
  function advance(end, reading, speed) {
    for (; at <= end; at += 20) {
      tracker.observe(reading(at), at);
      if (at % 200 !== 100) continue;
      const batch = tracker.batch();
      if (batch) fix = tracker.accept(batch, Array.from({ length: batch.payload.count }, () => [0, speed]));
    }
    return fix;
  }
  assert.equal(advance(1500, () => event(), .2).stationary, true);
  const walking = advance(2300, () => event(1), .5);
  assert(walking.y > .2);
  const tremor = time => event(time % 160 === 0 ? .5 : .14);
  const buffered = advance(2700, tremor, .2);
  assert(buffered.y > walking.y);
  assert.equal(buffered.stationary, false);
  const settled = advance(3300, tremor, .2);
  assert.equal(settled.stationary, true);
  assert.equal(advance(6100, tremor, .2).y, settled.y);
  const resume = advance(7100, time => {
    const reading = event();
    reading.acceleration.y = time % 80 === 0 ? .9 : -.9;
    return reading;
  }, .5);
  assert.equal(resume.stationary, false);
  assert(resume.y > settled.y + .1);
});

test('only the room host can send valid RoNIN windows from an allowed origin', async () => {
  let calls = 0;
  const ronin = { available: true, async infer({ count }) { calls++; return Array.from({ length: count }, () => [0, 0]); } };
  const h = backendHarness(':memory:', { ronin });
  const owner = h.client(), guest = h.client();
  const batch = { count: 1, startMs: 0, frames: Array.from({ length: 51 }, (_, i) => [i * 20, 0, 0, 0, 0, 0, 9.81]) };
  const post = (client, path, data, headers) => client.call('POST', path, data, headers);
  const select = (client, mode, headers) => post(client, '/api/mode', { mode, treasureId: client.data.room.treasureId }, headers);
  try {
    owner.createOutdoor(); guest.join(owner.data.room.code);
    assert.equal((await post(owner, '/api/ronin', batch)).status, 409);
    assert.equal((await select(guest, 'indoor-ronin')).status, 403);
    assert.equal((await select(owner, 'indoor-ronin', { origin: 'https://unknown.example.test' })).status, 403);
    assert.equal((await select(owner, 'indoor-ronin', { origin: 'https://field.example.test' })).status, 200);
    assert.equal((await select(owner, 'indoor-ronin')).status, 200);
    assert.equal((await post(guest, '/api/ronin', batch)).status, 403);
    assert.equal((await post(guest, '/api/ronin', batch, { origin: 'https://field.example.test' })).status, 403);
    assert.equal((await post(owner, '/api/ronin', batch, { origin: 'https://unknown.example.test' })).status, 403);
    assert.equal((await post(owner, '/api/ronin', batch, { 'x-csrf-token': 'invalid' })).status, 403);
    assert.equal((await post(owner, '/api/ronin', { ...batch, frames: batch.frames.slice(1) })).status, 400);
    assert.equal(calls, 0);
    assert.deepEqual((await post(owner, '/api/ronin', batch)).data, { velocities: [[0, 0]] });
    assert.deepEqual((await post(owner, '/api/ronin', batch, { origin: 'https://field.example.test' })).data, { velocities: [[0, 0]] });
    assert.equal(calls, 2);
    ronin.available = false;
    assert.equal((await post(owner, '/api/ronin', batch, { origin: 'https://field.example.test' })).status, 503);
  } finally { h.store.close(); }
});

test('RoNIN locks a shallow aim while the ground bearing follows fresh positions', () => {
  const h = backendHarness(':memory:', { ronin: { available: true } });
  const owner = h.client(); owner.createOutdoor();
  const post = (path, body) => owner.call('POST', path, { treasureId: owner.data.room.treasureId, ...body });
  const fix = (y, source = 'ronin-imu', stationary = true, x = 0) => post('/api/indoor', { fix: { x, y, heading: 0,
    timestamp: h.now(), frameId: 'ronin-test-frame', stationary, source } });
  try {
    assert.equal(post('/api/mode', { mode: 'indoor-ronin' }).status, 200);
    assert.equal(fix(0, 'planar-imu').data.accepted, false);
    assert.equal(fix(0).data.accepted, true);
    assert.equal(owner.place().data.room.radius, .7);
    h.advance(1000); assert.equal(fix(.69).data.state.phase, 'leave');
    h.advance(200); assert.equal(fix(.72).data.state.phase, 'return');
    h.advance(400); assert.equal(fix(.4, 'ronin-imu', false).data.state.phase, 'return');
    h.advance(1000);
    const near = fix(0, 'ronin-imu', false).data.state;
    assert.equal(near.phase, 'ready');
    assert.equal(near.nearField.radius, .5);
    assert.equal(near.guidance.frame, 'indoor');
    assert.equal(near.guidance.bearingDegrees, 180);
    assert.equal(near.guidance.pitchDegrees, -35);
    h.advance(200);
    const shifted = fix(0, 'ronin-imu', false, .15).data.state;
    assert.equal(shifted.guidance.bearingDegrees, 180);
    assert.equal(shifted.guidance.pitchDegrees, -35);
    assert.equal(shifted.guidance.radarBearingDegrees, 270);
    assert.equal(shifted.guidance.distanceMeters, .15);
    const projection = pitch => projectTreasure(cameraPose({ alpha: 180, beta: 90 + pitch, gamma: 0, absolute: true }, h.now()),
      shifted.guidance.bearingDegrees, 9 / 16, shifted.guidance.pitchDegrees);
    assert(projection(0).y > projection(-20).y);
    assert(projection(-20).y > 0);
    assert(Math.abs(projection(-35).y) < 1e-9);
    assert(projection(-35).visible);

    const aim = (pitch = near.guidance.pitchDegrees) => post('/api/aim', { sample: { heading: near.guidance.bearingDegrees, pitch,
        source: 'local-gyro', frameId: 'ronin-test-frame', encounterId: near.nearField.id,
        timestamp: h.now(), cameraLive: true, videoAgeMs: 0 } });
    assert.equal(aim(-90).data.accepted, false);
    assert.equal(aim(-22).data.accepted, true);
    for (const x of [.20, .24]) {
      h.advance(350); fix(0, 'ronin-imu', false, x);
      assert.equal(aim(-22).data.accepted, true);
    }
    assert.equal(owner.data.state.motionSteady, false);
    assert.equal(owner.data.state.canClaim, true);
    h.advance(100); fix(0, 'ronin-imu', false, .28);
    assert.equal(owner.data.state.canClaim, true);
    h.advance(100); fix(0, 'ronin-imu', false, .38);
    assert.equal(owner.data.state.canClaim, false);
    assert.equal(owner.collect().data.error.code, 'AIM_REQUIRED');
    for (let i = 0; i < 3; i++) {
      if (i) h.advance(350);
      assert.equal(aim(-22).data.accepted, true);
    }
    assert.equal(owner.collect().status, 200);
    assert.equal(owner.collect().data.collection.repeated, true);
    assert.equal(post('/api/mode', { mode: 'gps' }).data.room.placed, false);
  } finally { h.store.close(); }
});

test('an outstanding RoNIN request cannot delay stop or restore position', async () => {
  let finish, stopped = false;
  const session = new RemoteTreasureSession({ request: (path, init) => {
    if (path === '/api/ronin') {
      assert.equal(init.headers['X-CSRF-Token'], 'fixture');
      assert.equal(JSON.parse(init.body).roomCode, 'TESTROOM');
      return new Promise(resolve => { finish = resolve; });
    }
    assert.equal(path, '/api/location/stop');
    stopped = true;
    return Promise.resolve(Response.json({}));
  } });
  session.apply({ csrfToken: 'fixture', room: { code: 'TESTROOM', mode: 'indoor-ronin' },
    player: { id: 'fixture' }, state: { phase: 'unplaced' }, report: { collectionCount: 0 } });
  session.start(Date.now());
  const pending = session.inferRonin({ count: 1 }, new AbortController().signal);
  session.stop(Date.now());
  await session.tail;
  assert(stopped);
  finish(Response.json({ velocities: [[0, 1]] }));
  assert.equal(await pending, null);
  assert.equal(session.active, false);
});

test('the RoNIN camera draws the chest dot and edge arrow and releases motion on mode change', async () => {
  const session = new TreasureSession();
  let speed = 0;
  session.inferRonin = async ({ count }) => Array.from({ length: count }, () => [0, speed]);
  const h = harness({ session, motionPermission: async () => 'granted', getUserMedia: async () => cameraStream(), animationFrames: true });
  async function tick(count, reading = event()) {
    for (let i = 0; i < count; i++) {
      h.advance(100, false);
      if (h.cameraRequests) h.frame();
      h.motion(reading);
      h.paint();
      await new Promise(resolve => setImmediate(resolve));
    }
  }
  const visible = id => !('hidden' in h.node(id).attrs);
  await h.click('mode-ronin');
  assert.equal(h.node('mode-ronin').attrs['aria-pressed'], 'true');
  await h.click('start-location');
  await tick(17);
  assert.equal(h.node('place').disabled, false);
  h.click('place');
  assert.equal(h.node('start-camera').textContent, 'Open AR radar');
  await h.click('start-camera'); h.frame();
  assert.equal(h.node('motion-radar').hidden, false);
  assert(visible('radar-chest') && visible('radar-you') && !visible('radar-edge'));
  const initialHeading = h.node('radar-you').attrs.transform;
  h.advance(16, false);
  h.motion({ ...event(), rotationRate: { alpha: 0, beta: 90, gamma: 0 } }, false);
  assert.equal(h.paintCallbacks.size, 1);
  h.paint();
  assert.notEqual(h.node('radar-you').attrs.transform, initialHeading);
  h.window.screen.orientation.angle = 90; h.render();
  assert(visible('radar-chest') && !visible('radar-you'));
  h.window.screen.orientation.angle = 0;
  speed = 2; await tick(39, event(1));
  speed = 0; await tick(12);
  assert.equal(session.phase, 'return');
  assert(!visible('radar-chest') && visible('radar-edge'));
  speed = -2; await tick(22, event(1));
  speed = 0; await tick(12);
  assert(visible('radar-chest') && !visible('radar-edge'));
  assert.equal(h.geoRequests, 0);
  h.click('stop-camera');
  assert.equal(h.motionListening, true);
  h.click('open-menu');
  h.click('open-tools');
  assert.equal(h.node('indoor-readouts').hidden, false);
  assert.equal(h.node('readouts').hidden, true);
  assert.equal(h.node('departure-tools').hidden, true);
  assert.match(h.node('radar-offset').textContent, /^X .* · Y /);
  h.click('tools-back');
  h.click('mode-gps');
  assert.equal(h.node('mode-confirm').hidden, false);
  await h.click('mode-apply');
  assert.equal(h.node('motion-radar').hidden, true);
  assert.equal(h.motionListening, false);
  assert.equal(session.zone, null);
});
