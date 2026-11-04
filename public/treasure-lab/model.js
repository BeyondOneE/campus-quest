import { AimHold } from './ar.js';
export const DEFAULTS = Object.freeze({ radius: 3, exitMargin: 10, maxAccuracy: 20, maxAge: 15000, dwell: 2000 });
const number = value => typeof value === 'number' && Number.isFinite(value);

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
    this.config = { ...DEFAULTS, ...config };
    this.zone = null; this.fix = null; this.tracking = false; this.phase = 'unplaced';
    this.samples = 0; this.insideSamples = 0; this.insideSince = null;
    this.lastTimestamp = -Infinity; this.collectionCount = 0; this.events = [];
    this.aimHold = new AimHold(); this.lastBearing = null; this.nearBearing = null;
  }
  log(event, now) {
    this.events.push({ at: new Date(now).toISOString(), event });
    if (this.events.length > 100) this.events.shift();
  }
  clearDwell() { this.insideSince = null; this.insideSamples = 0; }
  start(now) { this.tracking = true; this.log('location-started', now); }
  stop(now) {
    this.tracking = false; this.fix = null; this.clearDwell();
    this.aimHold.reset();
    if (this.phase === 'ready') this.phase = 'return';
    this.log('location-stopped', now);
  }
  loseLocation(now) {
    this.fix = null; this.clearDwell(); this.aimHold.reset();
    if (this.phase === 'ready') this.phase = 'return';
    this.log('location-interrupted', now);
  }
  receive(fix, now) {
    if (!this.tracking || !validFix(fix) || fix.timestamp > now + 5000 || fix.timestamp <= this.lastTimestamp) return false;
    const previous = this.fix;
    this.fix = { ...fix }; this.lastTimestamp = fix.timestamp; this.samples += 1;
    const reading = classify(this.fix, this.zone, now, this.config);
    if (previous && fix.timestamp - previous.timestamp > this.config.maxAge) this.clearDwell();
    if (this.phase === 'leave' && reading.kind === 'outside') {
      this.phase = 'return'; this.log('outside-confirmed', now);
    } else if (this.phase === 'return' && reading.kind === 'inside') {
      this.insideSince ??= fix.timestamp; this.insideSamples += 1;
      if (this.insideSamples >= 2 && fix.timestamp - this.insideSince >= this.config.dwell) {
        this.phase = 'ready'; this.log('treasure-unlocked', now);
      }
    } else if (this.phase === 'ready' && reading.kind === 'outside') {
      this.phase = 'return'; this.clearDwell(); this.log('left-treasure-range', now);
    }
    if (reading.kind !== 'inside') this.clearDwell();
    if (this.zone && ['inside', 'outside', 'boundary'].includes(reading.kind)) {
      const bearing = bearingDegrees(this.fix, this.zone);
      const reliable = reading.distance >= (this.zone.radius === 3 ? .1 : Math.max(8, this.fix.accuracy * 1.5));
      if (reliable && bearing !== null) this.lastBearing = bearing;
      if (reading.kind === 'outside') this.nearBearing = null;
      if (['return', 'ready'].includes(this.phase) && reading.kind === 'inside' && this.nearBearing === null) {
        this.nearBearing = reliable && bearing !== null ? bearing : this.lastBearing;
      }
    }
    if (this.phase !== 'ready' || reading.kind !== 'inside') this.aimHold.reset();
    return true;
  }
  place(radius, now) {
    const reading = classify(this.fix, null, now, this.config);
    if (!this.tracking || reading.kind !== 'unplaced' || !number(radius) || radius < 3 || radius > 100) return false;
    this.zone = { latitude: this.fix.latitude, longitude: this.fix.longitude, radius, placementAccuracy: this.fix.accuracy, rangeVersion: 2 };
    this.phase = 'leave'; this.collectionCount = 0; this.clearDwell();
    this.aimHold.reset(); this.lastBearing = this.nearBearing = null;
    this.log('treasure-placed-from-live-location', now);
    return true;
  }
  snapshot(now) {
    const reading = this.tracking ? classify(this.fix, this.zone, now, this.config) : { kind: 'stopped', distance: null };
    const eligible = this.phase === 'ready' && reading.kind === 'inside';
    const canNavigate = Boolean(this.zone && ['return', 'ready'].includes(this.phase) && ['inside', 'outside', 'boundary'].includes(reading.kind));
    const nearby = this.nearBearing !== null && reading.kind !== 'outside';
    const bearing = nearby ? this.nearBearing : this.lastBearing;
    const aim = this.aimHold.snapshot(now);
    return { ...reading, phase: this.phase, eligible, canNavigate, canClaim: eligible && aim.ready, aim,
      guidance: canNavigate && bearing !== null ? { bearingDegrees: bearing, distanceMeters: reading.distance, mode: nearby ? 'nearby' : 'approach' } : null,
      canPlace: this.tracking && classify(this.fix, null, now, this.config).kind === 'unplaced' };
  }
  aim(sample, now) {
    const reading = this.snapshot(now);
    if (!reading.eligible || !reading.guidance) { this.aimHold.reset(); return false; }
    return this.aimHold.observe(sample, reading.guidance.bearingDegrees, now);
  }
  collect(now) {
    if (!this.snapshot(now).canClaim) return false;
    this.phase = 'collected'; this.collectionCount += 1; this.log('treasure-collected', now);
    return true;
  }
  report(now) {
    const reading = this.snapshot(now);
    return { config: { ...this.config, radius: this.zone?.radius ?? this.config.radius }, phase: this.phase,
      treasurePlaced: Boolean(this.zone), placementAccuracyMeters: this.zone?.placementAccuracy ?? null,
      collectionCount: this.collectionCount,
      location: { running: this.tracking, samples: this.samples, classification: reading.kind,
        distanceMeters: reading.distance === null ? null : Math.round(reading.distance),
        accuracyMeters: this.fix?.accuracy ?? null, sampleAgeMs: this.fix ? Math.max(0, now - this.fix.timestamp) : null },
      events: this.events.map(event => ({ ...event })) };
  }
}
