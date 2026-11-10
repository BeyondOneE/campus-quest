import { LocalSearchPose } from './ar.js';

export const ROOM_MODES = Object.freeze(['gps', 'indoor-ronin']);
export const DEFAULT_ROOM_MODE = 'indoor-ronin';
export const isIndoorMode = mode => mode === 'indoor-ronin';
export const INDOOR_DEFAULTS = Object.freeze({
  maxAge: 1500, departRadius: .7, returnRadius: .5, returnDwell: 1000,
  chestHeight: -.25, calibrationMs: 500, maxSampleGap: 500, maxSpeed: 3,
  stillAcceleration: .3, stillRotation: 12,
});

// Share calibration and the AR frame between horizontal position estimators.
export class IndoorMotionFrame {
  constructor() {
    this.tracker = new LocalSearchPose();
    this.pose = null;
    this.calibration = null;
    this.bias = null;
    this.lastAt = null;
    this.lastSampleAt = null;
    this.blocked = false;
  }

  readMotion(event, at, screenAngle) {
    const acceleration = [event.acceleration?.x, event.acceleration?.y, event.acceleration?.z];
    const gravity = [event.accelerationIncludingGravity?.x, event.accelerationIncludingGravity?.y, event.accelerationIncludingGravity?.z];
    const rotation = [event.rotationRate?.beta, event.rotationRate?.gamma, event.rotationRate?.alpha];
    if (![...acceleration, ...gravity, ...rotation].every(Number.isFinite) || rotation.some(value => Math.abs(value) > 720)) {
      this.pose = null;
      return { error: 'Waiting for linear acceleration and gyroscope readings.' };
    }
    const sampleAt = Number.isFinite(event.timeStamp) ? event.timeStamp : at;
    const interval = this.lastSampleAt === null ? 0 : sampleAt - this.lastSampleAt;
    const arrivalGap = this.lastAt === null ? 0 : at - this.lastAt;
    this.lastAt = at;
    this.lastSampleAt = sampleAt;
    if (interval < 0 || interval > INDOOR_DEFAULTS.maxSampleGap || arrivalGap > INDOOR_DEFAULTS.maxSampleGap) {
      this.calibration = null;
      this.blocked = Boolean(this.bias);
    }
    if (this.blocked) {
      this.pose = null;
      return { error: 'Motion interrupted. Stop and re-enable motion, then hide the treasure again.' };
    }
    if (!this.bias) {
      if (!this.calibrate(acceleration, gravity, rotation, sampleAt)) {
        return { error: 'Hold the phone still and upright to calibrate motion.' };
      }
      const [x, y, z] = this.calibration.gravity.map(value => value / this.calibration.count);
      const pose = this.tracker.motion({
        rotationRate: { beta: 0, gamma: 0, alpha: 0 },
        accelerationIncludingGravity: { x, y, z },
      }, sampleAt, screenAngle);
      this.calibration = null;
      if (pose.error) { this.bias = null; return pose; }
      this.pose = { ...pose, at };
      return { sampleAt, interval: null, horizontal: [0, 0], quiet: true };
    }

    const [beta, gamma, alpha] = rotation.map((value, i) => value - this.bias.rotation[i]);
    const pose = this.tracker.motion({ rotationRate: { beta, gamma, alpha } }, sampleAt, screenAngle);
    this.pose = pose.error ? null : { ...pose, at };
    if (!this.pose) return pose;

    const linear = acceleration.map((value, i) => value - this.bias.acceleration[i]);
    const [ax, ay] = this.tracker.bodyToLocal(linear);
    const quiet = Math.hypot(ax, ay) < INDOOR_DEFAULTS.stillAcceleration
      && Math.hypot(beta, gamma, alpha) < INDOOR_DEFAULTS.stillRotation;
    return { sampleAt, interval, horizontal: [ax, ay], quiet };
  }

  features(event) {
    const { beta, gamma, alpha } = event.rotationRate;
    const gyro = [beta, gamma, alpha].map((value, i) => (value - this.bias.rotation[i]) * Math.PI / 180);
    const accel = ['x', 'y', 'z'].map((axis, i) => event.accelerationIncludingGravity[axis] - this.bias.acceleration[i]);
    return [...this.tracker.bodyToLocal(gyro), ...this.tracker.bodyToLocal(accel)];
  }

  calibrate(acceleration, gravity, rotation, at) {
    const length = Math.hypot(...gravity);
    if (Math.abs(length - 9.80665) > 1 || Math.hypot(gravity[0], gravity[1]) < length * .6
      || Math.hypot(...acceleration) >= .4 || Math.hypot(...rotation) >= INDOOR_DEFAULTS.stillRotation) {
      this.calibration = null;
      return false;
    }
    this.calibration ??= { since: at, count: 0, acceleration: [0, 0, 0], rotation: [0, 0, 0], gravity: [0, 0, 0] };
    const samples = this.calibration;
    samples.count++;
    for (let i = 0; i < 3; i++) {
      samples.acceleration[i] += acceleration[i];
      samples.rotation[i] += rotation[i];
      samples.gravity[i] += gravity[i];
    }
    if (samples.count < 3 || at - samples.since < INDOOR_DEFAULTS.calibrationMs) return false;
    this.bias = {
      acceleration: samples.acceleration.map(value => value / samples.count),
      rotation: samples.rotation.map(value => value / samples.count),
    };
    return true;
  }
}

export function validIndoorFix(fix, now) {
  return Boolean(fix && fix.source === 'ronin-imu' && typeof fix.stationary === 'boolean'
    && typeof fix.frameId === 'string' && fix.frameId.length > 0 && fix.frameId.length <= 100
    && [fix.x, fix.y, fix.heading, fix.timestamp].every(Number.isFinite) && Math.abs(fix.x) <= 20 && Math.abs(fix.y) <= 20
    && fix.heading >= 0 && fix.heading < 360 && now - fix.timestamp <= INDOOR_DEFAULTS.maxAge && fix.timestamp <= now + 1000);
}
