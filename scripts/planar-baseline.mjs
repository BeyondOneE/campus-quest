import { IndoorMotionFrame, INDOOR_DEFAULTS } from '../public/treasure-lab/indoor.js';

const BASELINE_DEFAULTS = Object.freeze({ ...INDOOR_DEFAULTS, stillMs: 350, maxResidualBias: .4, correctionSpeed: 1.5 });

// Integrate only the horizontal components in the same frame used by the AR camera.
export class IndoorPlanar extends IndoorMotionFrame {
  constructor() {
    super();
    this.position = [0, 0];
    this.velocity = [0, 0];
    this.previousAcceleration = [0, 0];
    this.stationary = true;
    this.segmentStart = null;
    this.stopCandidate = null;
    this.correctionTarget = null;
  }

  observe(event, at, screenAngle = 0) {
    const motion = this.readMotion(event, at, screenAngle);
    if (motion.error) return motion;
    if (motion.interval !== null) this.integrate(motion.horizontal, motion.quiet, motion.sampleAt, motion.interval / 1000);
    const [x, y] = this.position;
    return { x, y, heading: this.pose.heading, frameId: this.pose.frameId, timestamp: at,
      source: 'planar-imu', stationary: this.stationary };
  }

  integrate(horizontal, quiet, at, dt) {
    const accelerating = Math.hypot(...horizontal) >= BASELINE_DEFAULTS.stillAcceleration;
    if (this.correctionTarget) {
      if (!accelerating) {
        const delta = this.correctionTarget.map((value, i) => value - this.position[i]);
        const distance = Math.hypot(...delta), maxChange = BASELINE_DEFAULTS.correctionSpeed * dt;
        if (distance <= maxChange) {
          this.position = this.correctionTarget;
          this.correctionTarget = null;
          this.stationary = true;
        } else {
          this.position = this.position.map((value, i) => value + delta[i] * maxChange / distance);
        }
        return;
      }
      // Continue from the displayed estimate if the phone moves during correction.
      this.correctionTarget = null;
      this.stationary = true;
    }
    if (this.stationary) {
      if (!accelerating) return;
      this.stationary = false;
      this.segmentStart = at - dt * 1000;
    }
    const previousVelocity = this.velocity;
    const next = previousVelocity.map((value, i) => value + (this.previousAcceleration[i] + horizontal[i]) * dt / 2);
    const speed = Math.hypot(...next);
    this.velocity = speed > BASELINE_DEFAULTS.maxSpeed ? next.map(value => value * BASELINE_DEFAULTS.maxSpeed / speed) : next;
    this.position = this.position.map((value, i) => value + (previousVelocity[i] + this.velocity[i]) * dt / 2);
    this.previousAcceleration = horizontal;

    if (!quiet) {
      this.stopCandidate = null;
      return;
    }
    this.stopCandidate ??= { at, position: this.position, velocity: this.velocity };
    if (at - this.stopCandidate.at < BASELINE_DEFAULTS.stillMs) return;
    const stop = this.stopCandidate;
    const duration = (stop.at - this.segmentStart) / 1000;
    // A zero endpoint velocity estimates constant residual acceleration over this segment.
    // Correct the displacement by half of the velocity residual times the segment duration.
    const plausible = duration > 0 && Math.hypot(...stop.velocity) <= BASELINE_DEFAULTS.maxResidualBias * duration;
    const target = stop.position.map((value, i) => plausible ? value - stop.velocity[i] * duration / 2 : value);
    this.velocity = [0, 0];
    this.previousAcceleration = [0, 0];
    this.stopCandidate = null;
    if (Math.hypot(target[0] - this.position[0], target[1] - this.position[1]) < 1e-6) {
      this.position = target;
      this.stationary = true;
    } else {
      this.correctionTarget = target;
    }
  }
}
