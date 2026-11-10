import { AimHold, validAim, wrap } from './ar.js';
import { INDOOR_DEFAULTS, ROOM_MODES, isIndoorMode, validIndoorFix } from './indoor.js';
export const NEAR_DEFAULTS = Object.freeze({ radius: 15, exitRadius: 35, duration: 90000, exitDwell: 3000, targetBearing: 45 });
export const DEFAULTS = Object.freeze({ radius: 3, exitMargin: 10, maxAccuracy: 20, maxAge: 15000, dwell: 2000 });
const number = value => typeof value === 'number' && Number.isFinite(value);
const indoorBearing = (from, to) => wrap(Math.atan2(to.x - from.x, to.y - from.y) * 180 / Math.PI);
const roninMaxDownPitch = 35;

export function normalizeRoomCode(value) {
  if (typeof value !== 'string') return null;
  const code = value.replace(/[\s-]+/g, '');
  return /^(?:[0-9]{4}|[A-Za-z2-9]{8})$/.test(code) ? code.toUpperCase() : null;
}

export function validFix(fix) {
  return Boolean(fix && number(fix.latitude) && Math.abs(fix.latitude) <= 90
    && number(fix.longitude) && Math.abs(fix.longitude) <= 180
    && number(fix.accuracy) && fix.accuracy >= 0 && number(fix.timestamp));
}

export function distanceMeters(a, b) {
  const rad = degrees => degrees * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude), dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
}

export function bearingDegrees(a, b) {
  if (distanceMeters(a, b) < .01) return null;
  const rad = degrees => degrees * Math.PI / 180;
  const lat1 = rad(a.latitude), lat2 = rad(b.latitude), lon = rad(b.longitude - a.longitude);
  return (Math.atan2(Math.sin(lon) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon)) * 180 / Math.PI + 360) % 360;
}

export function classify(fix, zone, now, config = DEFAULTS) {
  if (!validFix(fix)) return { kind: 'waiting', distance: null };
  if (now - fix.timestamp > config.maxAge || fix.timestamp > now + 5000) return { kind: 'stale', distance: null };
  if (fix.accuracy > config.maxAccuracy) return { kind: 'imprecise', distance: null };
  if (!zone) return { kind: 'unplaced', distance: null };
  const distance = distanceMeters(zone, fix);
  // Explicit small-range test mode: reported centre distance, not measured physical error.
  if (zone.radius === 3) return { kind: distance <= 3 ? 'inside' : 'outside', distance };
  // This is a conservative test of provider-reported uncertainty, not proof of actual error.
  if (distance + fix.accuracy <= zone.radius) return { kind: 'inside', distance };
  if (distance - fix.accuracy >= zone.radius + config.exitMargin) return { kind: 'outside', distance };
  return { kind: 'boundary', distance };
}

export class TreasureSession {
  constructor(config = {}) {
    this.config = { ...DEFAULTS, ...config }; this.mode=config.mode||'gps';this.indoorFix=null;
    this.zone = null; this.fix = null; this.tracking = false; this.phase = 'unplaced';
    this.samples = 0; this.insideSamples = 0; this.insideSince = null;
    this.lastTimestamp = -Infinity; this.collectionCount = 0; this.events = [];
    this.encounter = null; this.farSince = null; this.farSamples = 0;
    this.aimHold = new AimHold(); this.lastBearing = null;
  }
  log(event, now) {
    this.events.push({ at: new Date(now).toISOString(), event });
    if (this.events.length > 100) this.events.shift();
  }
  setMode(mode,now){
    if(!ROOM_MODES.includes(mode))return false;
    if(mode===this.mode)return true;
    this.stop(now);this.mode=mode;this.zone=null;this.phase='unplaced';this.collectionCount=0;this.indoorFix=null;this.lastTimestamp=-Infinity;return true;
  }
  indoorReading(now){
    if(!this.tracking)return {kind:'stopped',distance:null};
    if(!this.indoorFix)return {kind:'waiting',distance:null};
    if(!validIndoorFix(this.indoorFix,now))return {kind:'stale',distance:null};
    if(!this.zone)return {kind:'unplaced',distance:null};
    if(this.zone.frameId!==this.indoorFix.frameId)return {kind:'unplaced',distance:null,needsPlacement:true};
    const distance=Math.hypot(this.zone.x-this.indoorFix.x,this.zone.y-this.indoorFix.y);
    return {kind:distance<=INDOOR_DEFAULTS.returnRadius?'inside':'outside',distance};
  }
  lockEncounter(now, aimTarget = null){
    this.phase='ready';this.encounter={id:globalThis.crypto.randomUUID(),expiresAt:now+NEAR_DEFAULTS.duration,frameId:null,source:null,aimTarget};
    this.aimHold.reset();this.log('near-search-locked',now);
  }
  receiveIndoor(fix, now) {
    if (!this.tracking || !isIndoorMode(this.mode) || !validIndoorFix(fix, now)) return false;
    const previous = this.indoorFix;
    if (previous && fix.frameId === previous.frameId) {
      const elapsed = fix.timestamp - previous.timestamp;
      const moved = Math.hypot(fix.x - previous.x, fix.y - previous.y);
      if (elapsed <= 0 || moved > INDOOR_DEFAULTS.maxSpeed * elapsed / 1000 + .02) return false;
      if (elapsed > INDOOR_DEFAULTS.maxAge) { this.clearDwell(); this.aimHold.reset(); }
      else this.aimHold.trackPosition([fix.x, fix.y]);
    } else {
      if (Math.hypot(fix.x, fix.y) > .02 || !fix.stationary) return false;
      if (previous) {
        this.cancelEncounter(now);
        this.clearDwell();
        if (this.zone) this.phase = 'leave';
      }
    }
    this.indoorFix = { ...fix };
    this.samples++;
    this.expireEncounter(now);
    const reading = this.indoorReading(now);
    if (reading.distance >= .1) this.lastBearing = indoorBearing(fix, this.zone);
    if (this.phase === 'leave' && reading.distance >= INDOOR_DEFAULTS.departRadius && fix.stationary) {
      this.phase = 'return';
      this.clearDwell();
    } else if (this.phase === 'return' && !this.encounter) {
      // Nearby search can lock during a turn. Aim tolerates small movement within the local frame.
      if (reading.kind === 'inside') {
        this.insideSince ??= fix.timestamp;
        this.insideSamples++;
        if (this.insideSamples >= 2 && fix.timestamp - this.insideSince >= INDOOR_DEFAULTS.returnDwell) {
          // At very short range, keep the last useful approach bearing and a reachable tilt.
          this.lockEncounter(now, {
            bearingDegrees: this.lastBearing ?? fix.heading,
            pitchDegrees: Math.max(-roninMaxDownPitch, Math.atan2(this.zone.height, reading.distance) * 180 / Math.PI),
          });
        }
      }
      else this.clearDwell();
    }
    return true;
  }
  clearDwell() { this.insideSince = null; this.insideSamples = 0; }
  start(now) { this.tracking = true; this.log('location-started', now); }
  cancelEncounter(now, id = this.encounter?.id) {
    if (!this.encounter || id !== this.encounter.id) return false;
    this.encounter = null; this.farSince = null; this.farSamples = 0; this.clearDwell(); this.aimHold.reset();
    if (this.phase === 'ready') this.phase = 'return';
    this.log('near-search-ended', now); return true;
  }
  expireEncounter(now) { if (this.encounter && now >= this.encounter.expiresAt) this.cancelEncounter(now); }
  stop(now) {
    this.cancelEncounter(now);
    this.tracking = false; this.fix = null; this.indoorFix=null; this.clearDwell();
    this.aimHold.reset();
    if (this.phase === 'ready') this.phase = 'return';
    this.log('location-stopped', now);
  }
  loseLocation(now) {
    this.fix = null; this.clearDwell(); this.expireEncounter(now);
    if (!this.encounter) this.aimHold.reset();
    this.log('location-interrupted', now);
  }
  receive(fix, now) {
    if(this.mode!=='gps')return false;
    if (!this.tracking || !validFix(fix) || fix.timestamp > now + 5000 || fix.timestamp <= this.lastTimestamp) return false;
    const previous = this.fix;
    this.fix = { ...fix }; this.lastTimestamp = fix.timestamp; this.samples += 1;
    const reading = classify(this.fix, this.zone, now, this.config);
    this.expireEncounter(now);
    if (previous && fix.timestamp - previous.timestamp > this.config.maxAge) { this.clearDwell(); this.farSince=null; this.farSamples=0; }
    if (this.phase === 'leave' && reading.kind === 'outside') {
      this.phase = 'return'; this.clearDwell(); this.log('outside-confirmed', now);
    } else if (this.phase === 'return') {
      if (reading.distance !== null && reading.distance <= NEAR_DEFAULTS.radius && ['inside','outside','boundary'].includes(reading.kind)) {
        this.insideSince ??= fix.timestamp; this.insideSamples++;
        if (this.insideSamples >= 2 && fix.timestamp - this.insideSince >= this.config.dwell) {
          this.lockEncounter(now);
        }
      } else this.clearDwell();
    }
    if (this.encounter) {
      if (reading.distance !== null && reading.distance - fix.accuracy > NEAR_DEFAULTS.exitRadius) {
        this.farSince ??= fix.timestamp; this.farSamples++;
        if (this.farSamples >= 2 && fix.timestamp - this.farSince >= NEAR_DEFAULTS.exitDwell) this.cancelEncounter(now);
      } else { this.farSince = null; this.farSamples = 0; }
    }
    if (this.zone && reading.distance !== null) {
      const bearing = bearingDegrees(this.fix, this.zone);
      if (bearing !== null && reading.distance >= Math.max(8, this.fix.accuracy * 1.5)) this.lastBearing = bearing;
    }
    return true;
  }
  place(radius, now) {
    if (isIndoorMode(this.mode)) {
      const reading = this.indoorReading(now);
      if (!['inside', 'outside', 'unplaced'].includes(reading.kind) || !this.indoorFix.stationary) return false;
      this.cancelEncounter(now);
      this.zone = { kind: this.mode, x: this.indoorFix.x, y: this.indoorFix.y, frameId: this.indoorFix.frameId,
        radius: INDOOR_DEFAULTS.departRadius, height: INDOOR_DEFAULTS.chestHeight, rangeVersion: 2 };
      this.lastBearing = null;
      this.phase='leave';this.collectionCount=0;this.clearDwell();this.aimHold.reset();return true;
    }
    const reading = classify(this.fix, null, now, this.config);
    if (!this.tracking || reading.kind !== 'unplaced' || !number(radius) || radius < 3 || radius > 100) return false;
    this.zone = { latitude: this.fix.latitude, longitude: this.fix.longitude, radius, placementAccuracy: this.fix.accuracy, rangeVersion: 2 };
    this.cancelEncounter(now);
    this.phase = 'leave'; this.collectionCount = 0; this.clearDwell();
    this.aimHold.reset(); this.lastBearing = null;
    this.log('treasure-placed-from-live-location', now);
    return true;
  }
  snapshot(now) {
    const indoor = isIndoorMode(this.mode);
    const reading = indoor ? this.indoorReading(now)
      : this.tracking ? classify(this.fix, this.zone, now, this.config) : { kind: 'stopped', distance: null };
    this.expireEncounter(now);
    const locked = Boolean(this.tracking && this.encounter && this.phase === 'ready' && (!indoor || reading.distance !== null));
    const cameraPhase = this.phase === 'return' || (indoor && this.phase === 'leave');
    const canNavigate = locked || Boolean(this.zone && cameraPhase && ['inside','outside','boundary'].includes(reading.kind));
    const aim = this.aimHold.snapshot(now);
    const motionReady = ['inside', 'outside', 'unplaced'].includes(reading.kind);
    const motionSteady = motionReady && this.indoorFix?.stationary === true;
    let guidance = null;
    if (locked && !indoor) {
      guidance = { bearingDegrees: NEAR_DEFAULTS.targetBearing, distanceMeters: reading.distance,
        mode: 'nearby', frame: 'local', encounterId: this.encounter.id };
    } else if (canNavigate && indoor) {
      const groundBearing = indoorBearing(this.indoorFix, this.zone);
      guidance = { bearingDegrees: groundBearing, distanceMeters: reading.distance,
        mode: 'approach', frame: 'indoor' };
      if (locked) Object.assign(guidance, this.encounter.aimTarget, {
        mode: 'nearby', encounterId: this.encounter.id, radarBearingDegrees: groundBearing,
      });
    } else if (canNavigate && this.lastBearing !== null) {
      guidance = { bearingDegrees: this.lastBearing, distanceMeters: reading.distance, mode: 'approach', frame: 'earth' };
    }
    const canPlace = indoor ? motionSteady
      : this.tracking && classify(this.fix, null, now, this.config).kind === 'unplaced';
    return { ...reading, mode: this.mode, phase: this.phase, eligible: locked, canNavigate, guidance, canPlace, aim,
      ...(indoor ? { motionSteady } : {}),
      canClaim: locked && aim.ready,
      nearField: locked ? { id: this.encounter.id, expiresInMs: this.encounter.expiresAt - now,
        radius: indoor ? INDOOR_DEFAULTS.returnRadius : NEAR_DEFAULTS.radius,
        exitRadius: indoor ? null : NEAR_DEFAULTS.exitRadius } : null };
  }
  aim(sample, now) {
    const reading = this.snapshot(now);
    if (!sample || !reading.eligible || sample.encounterId !== this.encounter.id
      || !['relative-orientation','local-gyro'].includes(sample.source) || typeof sample.frameId !== 'string' || sample.frameId.length < 1 || sample.frameId.length > 100) {
      this.aimHold.reset(); return false;
    }
    if (this.encounter.frameId !== null && (sample.frameId !== this.encounter.frameId || sample.source !== this.encounter.source)) {
      this.aimHold.reset(); return false;
    }
    const indoor = isIndoorMode(this.mode);
    if (indoor && (sample.source !== 'local-gyro'
      || sample.frameId !== this.indoorFix.frameId)) {
      this.aimHold.reset(); return false;
    }
    // Bind the calibration frame only after a structurally valid fresh sample.
    if (!validAim(sample, now)) { this.aimHold.reset(); return false; }
    this.encounter.frameId ??= sample.frameId; this.encounter.source ??= sample.source;
    const position = indoor ? [this.indoorFix.x, this.indoorFix.y] : null;
    return this.aimHold.observe(sample, reading.guidance.bearingDegrees, now, reading.guidance.pitchDegrees, position);
  }
  collect(now) {
    if (!this.snapshot(now).canClaim) return false;
    this.encounter = null; this.aimHold.reset();
    this.phase = 'collected'; this.collectionCount += 1; this.log('treasure-collected', now);
    return true;
  }
  report(now) {
    const reading = this.snapshot(now);
    const indoor = isIndoorMode(this.mode) ? { estimated: true, method: 'ronin-resnet18' } : null;
    return {mode:this.mode, indoor, config: { ...this.config, radius: this.zone?.radius ?? this.config.radius, nearField: { ...NEAR_DEFAULTS } }, phase: this.phase,
      treasurePlaced: Boolean(this.zone), placementAccuracyMeters: this.zone?.placementAccuracy ?? null,
      collectionCount: this.collectionCount,
      location: { running: this.mode==='gps'&&this.tracking, samples: this.samples, classification: reading.kind,
        distanceMeters: reading.distance === null ? null : Math.round(reading.distance),
        accuracyMeters: this.fix?.accuracy ?? null, sampleAgeMs: this.fix ? Math.max(0, now - this.fix.timestamp) : null },
      events: this.events.map(event => ({ ...event })) };
  }
}
