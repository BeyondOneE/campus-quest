import test from 'node:test';
import assert from 'node:assert/strict';
import { IndoorPlanar } from '../scripts/planar-baseline.mjs';

// Controlled motion traces for regression tests. Physical iPhone behavior needs separate validation.
const motion = ({ y = 0, z = 0, alpha = 0, beta = 0, gamma = 0 } = {}) => ({
  acceleration: { x: 0, y, z },
  accelerationIncludingGravity: { x: 0, y: 9.80665, z: 0 },
  rotationRate: { alpha, beta, gamma },
});
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≠ ${expected}`);

test('horizontal integration is independent of vertical acceleration, including when the phone is tilted', () => {
  function walk(vertical) {
    const tracker = new IndoorPlanar();
    let at = 0;
    const tick = event => tracker.observe(event, at += 100, 90);
    let fix;
    for (let i = 0; i < 6; i++) fix = tick(motion());
    assert.equal(fix.source, 'planar-imu');
    assert.equal(fix.stationary, true);
    tick(motion({ beta: -300 })); // Tilt the camera 30° down.
    const tilt = Math.PI / 3;
    const fromRoom = (forward, up) => motion({
      y: forward * Math.cos(tilt) + up * Math.sin(tilt),
      z: -forward * Math.sin(tilt) + up * Math.cos(tilt),
    });
    for (let i = 0; i < 6; i++) fix = tick(fromRoom(0, vertical));
    closeTo(fix.x, 0); closeTo(fix.y, 0);
    for (const acceleration of [2, -2]) {
      for (let i = 0; i < 8; i++) fix = tick(fromRoom(acceleration, i % 2 ? vertical : -vertical));
    }
    for (let i = 0; i < 6; i++) fix = tick(fromRoom(0, vertical));
    assert.equal(fix.stationary, true);
    closeTo(fix.x, 0); closeTo(fix.y, 1.28);
    for (let i = 0; i < 15; i++) closeTo(tick(fromRoom(.1, 0)).y, fix.y);
    assert.match(tracker.observe(motion(), at + 501).error, /interrupted/i);
  }
  walk(0);
  walk(3);
});

test('a measured stop corrects residual acceleration bias on a closed motion trace', () => {
  const tracker = new IndoorPlanar();
  let sampleTime = 0;
  const tick = (interval, acceleration = 0) => {
    sampleTime += interval;
    const arrival = 1000000 + sampleTime + (sampleTime % 40 === 0 ? 7 : 0);
    return tracker.observe({ ...motion({ z: -acceleration }), timeStamp: sampleTime }, arrival);
  };
  let fix;
  for (let i = 0; i <= 30; i++) fix = tick(20);
  assert.equal(fix.stationary, true);
  for (let ms = 20; ms <= 6000; ms += 20) {
    // x(t) = A(1 - cos(wt))² has zero position, velocity and acceleration at each cycle boundary.
    const angle = 2 * Math.PI * 4 * ms / 1000;
    fix = tick(20, 3 * (Math.cos(angle) - Math.cos(2 * angle)) + .12);
  }
  assert.ok(fix.y > 2, 'the moving estimate still follows the samples');
  for (let i = 0; i < 130; i++) fix = tick(20, .12);
  assert.equal(fix.stationary, true);
  assert.ok(Math.hypot(fix.x, fix.y) < .01);
  const start = fix.y;
  for (const acceleration of [2, -2]) for (let i = 0; i < 8; i++) fix = tick(100, acceleration);
  for (let i = 0; i < 10; i++) fix = tick(100);
  closeTo(fix.y - start, 1.28);
});
