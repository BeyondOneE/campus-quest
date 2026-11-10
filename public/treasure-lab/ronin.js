import { IndoorMotionFrame, INDOOR_DEFAULTS } from './indoor.js';

const windowMs = 1000;
const strideMs = 50;
const maxGapMs = 100;
const maxBatch = 8;
const maxFrames = 256;
const stillWindowMs = 400;
const stillAccelerationRms = .35;
const stillRotationRms = INDOOR_DEFAULTS.stillRotation * Math.PI / 180;
const axes = ['x', 'y', 'z'];

const negate = vector => Object.fromEntries(axes.map(axis =>
  [axis, Number.isFinite(vector?.[axis]) ? -vector[axis] : null]));

export function normalizeIosMotion(event, timeStamp = event.timeStamp) {
  // iOS WebKit exposes gyro X/Y/Z as alpha/beta/gamma and gravity with the Core Motion sign.
  const rate = event.rotationRate;
  return {
    timeStamp,
    rotationRate: { beta: rate?.alpha, gamma: rate?.beta, alpha: rate?.gamma },
    acceleration: negate(event.acceleration),
    accelerationIncludingGravity: negate(event.accelerationIncludingGravity),
  };
}

export function validRoninBatch({ frames, startMs, count }) {
  return Number.isInteger(count) && count >= 1 && count <= maxBatch
    && Number.isFinite(startMs) && startMs >= 0 && startMs <= maxGapMs
    && Array.isArray(frames) && frames.length >= 2 && frames.length <= maxFrames
    && frames.every((frame, i) => Array.isArray(frame) && frame.length === 7
      && frame.every(value => Number.isFinite(value))
      && frame[0] <= windowMs + (maxBatch - 1) * strideMs + 2 * maxGapMs
      && (i === 0 ? frame[0] === 0 : frame[0] > frames[i - 1][0] && frame[0] - frames[i - 1][0] <= maxGapMs)
      && frame.slice(1).every(value => Math.abs(value) <= 200))
    && frames.at(-1)[0] >= startMs + windowMs + (count - 1) * strideMs;
}

export function validRoninVelocities(velocities, count) {
  return Array.isArray(velocities) && velocities.length === count && velocities.every(velocity =>
    Array.isArray(velocity) && velocity.length === 2 && velocity.every(value => Number.isFinite(value) && Math.abs(value) <= 200));
}

export class IndoorRonin extends IndoorMotionFrame {
  constructor() {
    super();
    this.frames = [];
    this.nextStart = null;
    this.position = null;
    this.velocity = null;
    this.currentQuiet = false;
    this.predictionStill = false;
    this.predictionEnd = null;
    this.interrupted = false;
  }

  stillThrough(end) {
    const start = end - stillWindowMs;
    if (!this.frames.length || this.frames[0].time > start || this.frames.at(-1).time < end) return false;
    let acceleration = 0, rotation = 0;
    for (let i = this.frames.length - 1; i > 0; i--) {
      const frame = this.frames[i];
      if (frame.time <= start) break;
      const duration = Math.min(end, frame.time) - Math.max(start, this.frames[i - 1].time);
      if (duration <= 0) continue;
      acceleration += frame.accelerationSquared * duration;
      rotation += frame.rotationSquared * duration;
    }
    return acceleration <= stillAccelerationRms ** 2 * stillWindowMs
      && rotation <= stillRotationRms ** 2 * stillWindowMs;
  }

  get stationary() {
    return Boolean(this.pose && this.currentQuiet && this.predictionStill
      && this.lastSampleAt - this.predictionEnd <= 400 && this.stillThrough(this.lastSampleAt));
  }

  observe(event, at, angle = 0, sampleAt = event.timeStamp ?? at) {
    const data = normalizeIosMotion(event, sampleAt);
    const motion = this.readMotion(data, at, angle);
    const previous = this.frames.at(-1)?.time;
    if (this.blocked || (previous !== undefined && (sampleAt - previous > maxGapMs || sampleAt < previous))
      || (this.nextStart !== null && sampleAt - this.nextStart > 3000)) {
      this.interrupted = true;
      this.pose = null;
      return { error: 'Motion was interrupted. Enable motion again and hide the treasure in the new frame.' };
    }
    this.currentQuiet = motion.quiet === true;
    if (motion.error) return motion;
    if (sampleAt !== previous) {
      const features = this.features(data);
      this.frames.push({ time: sampleAt, features,
        accelerationSquared: axes.reduce((sum, axis, i) => sum + (data.acceleration[axis] - this.bias.acceleration[i]) ** 2, 0),
        rotationSquared: features[0] ** 2 + features[1] ** 2 + features[2] ** 2 });
    }
    this.nextStart ??= sampleAt;
    return {};
  }

  batch() {
    if (this.nextStart === null || this.interrupted) return null;
    const count = Math.min(maxBatch, 1 + Math.floor((this.frames.at(-1).time - this.nextStart - windowMs) / strideMs));
    if (count < 1) return null;
    // Retain a sample on either side of the requested interval for interpolation.
    while (this.frames[1]?.time <= this.nextStart) this.frames.shift();
    const first = this.frames[0].time, end = this.nextStart + windowMs + (count - 1) * strideMs;
    const last = this.frames.findIndex(frame => frame.time >= end);
    const frames = this.frames.slice(0, last + 1).map(({ time, features }) => [time - first, ...features]);
    return { start: this.nextStart, end, payload: { frames, startMs: this.nextStart - first, count } };
  }

  accept(batch, velocities) {
    if (batch.start !== this.nextStart || this.interrupted) return null;
    if (!validRoninVelocities(velocities, batch.payload.count)) throw new Error('RoNIN returned an invalid motion estimate.');
    for (const [i, velocity] of velocities.entries()) {
      // RoNIN velocities are centred in their windows. Classify that same time,
      // so a stop now does not discard the last buffered steps.
      const centre = batch.start + windowMs / 2 + i * strideMs;
      this.predictionStill = this.stillThrough(centre + stillWindowMs / 2);
      const speed = Math.hypot(...velocity), max = INDOOR_DEFAULTS.maxSpeed;
      const next = this.predictionStill ? [0, 0] : speed <= max ? velocity : velocity.map(value => value * max / speed);
      if (this.position && this.velocity) {
        this.position = this.position.map((value, i) => value + (this.velocity[i] + next[i]) * strideMs / 2000);
      }
      this.velocity = next;
    }
    this.nextStart += batch.payload.count * strideMs;
    this.predictionEnd = batch.end;
    if (this.stationary) this.position ??= [0, 0];
    if (!this.position || !this.pose || this.lastSampleAt - this.predictionEnd > 400) return null;
    const timestamp = this.pose.at - (this.lastSampleAt - this.predictionEnd);
    return { x: this.position[0], y: this.position[1], heading: this.pose.heading, frameId: this.pose.frameId,
      timestamp, source: 'ronin-imu', stationary: this.stationary };
  }
}
