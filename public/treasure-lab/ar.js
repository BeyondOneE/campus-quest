// Direction overlay only: no ground anchor, visual SLAM or calibrated camera intrinsics.
export const AR_DEFAULTS = Object.freeze({ angle: 10, dwell: 1200, maxAge: 1500, maxGap: 900, maxAccuracy: 25, maxVideoAge: 750 });
const finite = value => typeof value === 'number' && Number.isFinite(value);
const rad = value => value * Math.PI / 180;
const deg = value => value * 180 / Math.PI;
export const wrap = value => (value % 360 + 360) % 360;
export const angleDelta = (value, origin) => (value - origin + 540) % 360 - 180;

// Rear-camera ray: Rz(alpha) Rx(beta) Ry(gamma) [0,0,-1], W3C orientation A.1.
export function cameraPose(event, at, screenAngle = 0, previous = null) {
  if (![event?.alpha, event?.beta, event?.gamma, at, screenAngle].every(finite)) return { error: 'Waiting for valid direction readings.' };
  if (event.alpha < 0 || event.alpha >= 360 || Math.abs(event.beta) > 180 || Math.abs(event.gamma) > 90) return { error: 'Waiting for valid direction readings.' };
  let alpha = event.alpha, source = 'absolute-orientation', accuracy = null;
  if (finite(event.webkitCompassHeading) && event.webkitCompassHeading >= 0 && event.webkitCompassHeading < 360) {
    source = 'webkit-compass'; alpha = wrap(360 - event.webkitCompassHeading);
    if (event.webkitCompassAccuracy !== undefined && event.webkitCompassAccuracy !== null) {
      if (!finite(event.webkitCompassAccuracy) || event.webkitCompassAccuracy < 0 || event.webkitCompassAccuracy > AR_DEFAULTS.maxAccuracy) {
        return { error: 'Compass accuracy is low. Move away from metal and gently move the phone to recalibrate.' };
      }
      accuracy = event.webkitCompassAccuracy;
    }
  } else if (event.absolute !== true) return { error: 'An absolute compass direction is required. Check Safari Motion & Orientation access.' };
  if (previous && previous.source === source && at - previous.at <= AR_DEFAULTS.maxAge) alpha = wrap(previous.alpha + angleDelta(alpha, previous.alpha) * .4);
  const a = rad(alpha), b = rad(event.beta), g = rad(event.gamma), s = rad(screenAngle);
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g);
  const right = [ca * cg - sa * sb * sg, cg * sa + ca * sb * sg, -cb * sg];
  const up = [-cb * sa, ca * cb, sb];
  const forward = [-ca * sg - cg * sa * sb, -sa * sg + ca * cg * sb, -cb * cg];
  if (Math.hypot(forward[0], forward[1]) < .15) return { error: 'Raise the phone and point the rear camera towards the horizon.' };
  return { at, alpha, source, accuracy, screenAngle,
    heading: wrap(deg(Math.atan2(forward[0], forward[1]))), pitch: deg(Math.asin(Math.max(-1, Math.min(1, forward[2])))),
    forward, right: right.map((v, i) => v * Math.cos(s) - up[i] * Math.sin(s)),
    up: up.map((v, i) => right[i] * Math.sin(s) + v * Math.cos(s)) };
}

export function projectTreasure(pose, bearing, aspect = 9 / 16) {
  if (!pose || !finite(bearing) || !finite(aspect) || aspect <= 0) return null;
  const target = [Math.sin(rad(bearing)), Math.cos(rad(bearing)), 0];
  const dot = axis => target.reduce((sum, value, i) => sum + value * axis[i], 0);
  const depth = dot(pose.forward), tanH = Math.tan(rad(30)), tanV = tanH / aspect;
  const x = depth > 0 ? dot(pose.right) / (depth * tanH) : 0;
  const y = depth > 0 ? -dot(pose.up) / (depth * tanV) : 0;
  return { x, y, visible: depth > 0 && Math.abs(x) <= .82 && Math.abs(y) <= .78,
    arrowAngle: depth > 0 ? deg(Math.atan2(x, -y)) : angleDelta(bearing, pose.heading),
    error: deg(Math.acos(Math.max(-1, Math.min(1, depth)))), delta: angleDelta(bearing, pose.heading) };
}

export function validAim(sample, now) {
  return Boolean(sample && [sample.heading, sample.pitch, sample.timestamp, sample.videoAgeMs].every(finite)
    && sample.heading >= 0 && sample.heading < 360 && Math.abs(sample.pitch) <= 90
    && sample.timestamp <= now + 5000 && now - sample.timestamp <= AR_DEFAULTS.maxAge
    && sample.videoAgeMs >= 0 && sample.videoAgeMs <= AR_DEFAULTS.maxVideoAge && sample.cameraLive === true
    && ['webkit-compass', 'absolute-orientation'].includes(sample.source)
    && (sample.accuracy == null || (finite(sample.accuracy) && sample.accuracy >= 0 && sample.accuracy <= AR_DEFAULTS.maxAccuracy)));
}

export class AimHold {
  constructor() { this.reset(); }
  reset() { this.since = null; this.lastAt = null; this.lastTimestamp = null; this.samples = 0; this.target = null; }
  observe(sample, bearing, now) {
    if (!validAim(sample, now) || !finite(bearing)) { this.reset(); return false; }
    const cosine = Math.cos(rad(sample.pitch)) * Math.cos(rad(angleDelta(bearing, sample.heading)));
    if (deg(Math.acos(Math.max(-1, Math.min(1, cosine)))) > AR_DEFAULTS.angle) { this.reset(); return false; }
    if (this.target !== bearing || (this.lastAt !== null && now - this.lastAt > AR_DEFAULTS.maxGap)) this.reset();
    if (this.lastTimestamp !== null && sample.timestamp <= this.lastTimestamp) return false;
    this.since ??= now; this.target = bearing; this.lastAt = now; this.lastTimestamp = sample.timestamp; this.samples++;
    return true;
  }
  snapshot(now) {
    const fresh = this.lastAt !== null && now - this.lastAt <= AR_DEFAULTS.maxGap;
    const heldMs = fresh ? Math.max(0, this.lastAt - this.since) : 0;
    return { ready: fresh && this.samples >= 3 && heldMs >= AR_DEFAULTS.dwell, heldMs,
      requiredMs: AR_DEFAULTS.dwell, expiresInMs: fresh ? Math.max(0, AR_DEFAULTS.maxGap - (now - this.lastAt)) : 0 };
  }
}
