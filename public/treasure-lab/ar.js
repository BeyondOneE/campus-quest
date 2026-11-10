// Projects a target direction in the camera view with an approximate field of view.
export const AR_DEFAULTS = Object.freeze({
  angle: 18, dwell: 700, maxIndoorAimTravel: .2, maxAge: 1500, maxGap: 900, maxAccuracy: 25, maxVideoAge: 750,
});
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

export function projectTreasure(pose, bearing, aspect = 9 / 16, pitch = 0) {
  if (!pose || ![bearing, aspect, pitch].every(finite) || aspect <= 0 || Math.abs(pitch) > 90) return null;
  const elevation = rad(pitch), horizontal = Math.cos(elevation);
  const target = [Math.sin(rad(bearing)) * horizontal, Math.cos(rad(bearing)) * horizontal, Math.sin(elevation)];
  const dot = axis => target.reduce((sum, value, i) => sum + value * axis[i], 0);
  const depth = dot(pose.forward), tanH = Math.tan(rad(30)), tanV = tanH / aspect;
  const right = dot(pose.right), up = dot(pose.up);
  const x = depth > 0 ? right / (depth * tanH) : 0;
  const y = depth > 0 ? -up / (depth * tanV) : 0;
  const arrowAngle = depth > 0 || pitch !== 0 ? deg(Math.atan2(right, up * aspect)) : angleDelta(bearing, pose.heading);
  return { x, y, visible: depth > 0 && Math.abs(x) <= .82 && Math.abs(y) <= .78,
    arrowAngle,
    error: deg(Math.acos(Math.max(-1, Math.min(1, depth)))), delta: angleDelta(bearing, pose.heading) };
}

export function floorHeading(pose) {
  const [forwardX, forwardY] = pose.forward;
  const [rightX, rightY] = pose.right;
  // A camera pointed almost vertically has no useful forward projection onto the floor.
  return Math.hypot(forwardX, forwardY) >= .15 ? pose.heading : wrap(deg(Math.atan2(-rightY, rightX)));
}

export function validAim(sample, now) {
  return Boolean(sample && [sample.heading, sample.pitch, sample.timestamp, sample.videoAgeMs].every(finite)
    && sample.heading >= 0 && sample.heading < 360 && Math.abs(sample.pitch) <= 90
    && sample.timestamp <= now + 5000 && now - sample.timestamp <= AR_DEFAULTS.maxAge
    && sample.videoAgeMs >= 0 && sample.videoAgeMs <= AR_DEFAULTS.maxVideoAge && sample.cameraLive === true
    && ['webkit-compass', 'absolute-orientation', 'relative-orientation', 'local-gyro'].includes(sample.source)
    && (sample.accuracy == null || (finite(sample.accuracy) && sample.accuracy >= 0 && sample.accuracy <= AR_DEFAULTS.maxAccuracy)));
}

const multiply = (a,b) => [a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],
  a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];
const axisQuaternion = (angle,axis) => { const q=[Math.cos(angle/2),0,0,0];q[axis+1]=Math.sin(angle/2);return q; };
function rotateVector(q, vector) {
  const [w, x, y, z] = q;
  return multiply(multiply(q, [0, ...vector]), [w, -x, -y, -z]).slice(1);
}
function localVector([x, y, z], heading) {
  const a = rad(heading), c = Math.cos(a), s = Math.sin(a);
  return [x * c - y * s, x * s + y * c, z];
}
function quaternionPose(q,at,screenAngle) {
  const rotate = vector => rotateVector(q, vector);
  const forward=rotate([0,0,-1]),right=rotate([1,0,0]),up=rotate([0,1,0]),s=rad(screenAngle);
  return {at,screenAngle,forward,right:right.map((v,i)=>v*Math.cos(s)-up[i]*Math.sin(s)),
    up:up.map((v,i)=>right[i]*Math.sin(s)+v*Math.cos(s)),
    heading:wrap(deg(Math.atan2(forward[0],forward[1]))),pitch:deg(Math.asin(Math.max(-1,Math.min(1,forward[2]))))};
}

// A short local rotational frame, never an estimate of walking distance or geographic north.
export class LocalSearchPose {
  constructor(){this.reset();}
  reset(){this.q=null;this.origin=null;this.lastAt=null;this.blocked=false;this.frameId=globalThis.crypto?.randomUUID?.()||`frame-${Date.now()}-${Math.random()}`;}
  local(pose,source){
    this.origin ??= pose.heading;
    const rotate = vector => localVector(vector, this.origin);
    return {...pose,heading:wrap(pose.heading-this.origin),forward:rotate(pose.forward),right:rotate(pose.right),up:rotate(pose.up),source,accuracy:null,frameId:this.frameId};
  }
  bodyToLocal(vector) {
    return localVector(rotateVector(this.q, vector), this.origin);
  }
  orientation(event,at,screenAngle){
    // Deliberately omit webkitCompassHeading / accuracy: this frame has no north reference.
    const pose=cameraPose({alpha:event.alpha,beta:event.beta,gamma:event.gamma,absolute:true},at,screenAngle);
    return pose.error?pose:this.local(pose,'relative-orientation');
  }
  motion(event,at,screenAngle){
    if(this.blocked)return {error:'Motion interrupted. Close and reopen AR to recalibrate.'};
    const rate=event.rotationRate;
    if(!rate||![rate.beta,rate.gamma,rate.alpha].every(v=>finite(v)&&Math.abs(v)<=720))return {error:'Waiting for gyroscope readings. Hold the phone upright.'};
    if(this.lastAt!==null&&(at-this.lastAt>500||at<this.lastAt)){this.blocked=true;return {error:'Motion interrupted. Close and reopen AR to recalibrate.'};}
    if(!this.q){
      const g=event.accelerationIncludingGravity;
      if(!g||![g.x,g.y,g.z].every(finite)||Math.hypot(g.x,g.y,g.z)<7||Math.hypot(g.x,g.y,g.z)>12)return {error:'Hold the phone still and upright to start local search.'};
      const beta=Math.atan2(g.y,Math.hypot(g.x,g.z)),gamma=Math.atan2(-g.x,g.z);
      this.q=multiply(axisQuaternion(beta,0),axisQuaternion(gamma,1));
    }
    const dt=this.lastAt===null?0:(at-this.lastAt)/1000;this.lastAt=at;
    const omega=[rate.beta,rate.gamma,rate.alpha].map(rad),speed=Math.hypot(...omega),angle=speed*dt;
    if(speed>0){const scale=Math.sin(angle/2)/speed;this.q=multiply(this.q,[Math.cos(angle/2),...omega.map(v=>v*scale)]);}
    const length=Math.hypot(...this.q);this.q=this.q.map(v=>v/length);
    return this.local(quaternionPose(this.q,at,screenAngle),'local-gyro');
  }
}

export class AimHold {
  constructor() { this.reset(); }
  reset() {
    this.since = null; this.lastAt = null; this.lastTimestamp = null; this.samples = 0;
    this.target = null; this.targetPitch = null; this.origin = null;
  }
  trackPosition(position) {
    if (this.origin && position && Math.hypot(position[0] - this.origin[0], position[1] - this.origin[1]) > AR_DEFAULTS.maxIndoorAimTravel) {
      this.reset();
    }
  }
  observe(sample, bearing, now, pitch = 0, position = null) {
    if (!validAim(sample, now) || !finite(bearing) || !finite(pitch) || Math.abs(pitch) > 90) { this.reset(); return false; }
    const elevation = rad(sample.pitch), targetElevation = rad(pitch);
    const cosine = Math.cos(elevation) * Math.cos(targetElevation) * Math.cos(rad(angleDelta(bearing, sample.heading)))
      + Math.sin(elevation) * Math.sin(targetElevation);
    if (deg(Math.acos(Math.max(-1, Math.min(1, cosine)))) > AR_DEFAULTS.angle) { this.reset(); return false; }
    if (this.target !== bearing || this.targetPitch !== pitch || (this.lastAt !== null && now - this.lastAt > AR_DEFAULTS.maxGap)) this.reset();
    this.trackPosition(position);
    if (this.lastTimestamp !== null && sample.timestamp <= this.lastTimestamp) return false;
    if (!this.origin && position) this.origin = [...position];
    this.since ??= now; this.target = bearing; this.targetPitch = pitch; this.lastAt = now; this.lastTimestamp = sample.timestamp; this.samples++;
    return true;
  }
  snapshot(now) {
    const fresh = this.lastAt !== null && now - this.lastAt <= AR_DEFAULTS.maxGap;
    const heldMs = fresh ? Math.max(0, this.lastAt - this.since) : 0;
    return { ready: fresh && this.samples >= 3 && heldMs >= AR_DEFAULTS.dwell, heldMs,
      requiredMs: AR_DEFAULTS.dwell, expiresInMs: fresh ? Math.max(0, AR_DEFAULTS.maxGap - (now - this.lastAt)) : 0 };
  }
}
