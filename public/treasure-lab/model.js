export const DEFAULTS = Object.freeze({ radius: 30, exitMargin: 10, maxAccuracy: 20, maxAge: 15000, dwell: 2000 });
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

export function classify(fix, zone, now, config = DEFAULTS) {
  if (!validFix(fix)) return { kind: 'waiting', distance: null };
  if (now - fix.timestamp > config.maxAge || fix.timestamp > now + 5000) return { kind: 'stale', distance: null };
  if (fix.accuracy > config.maxAccuracy) return { kind: 'imprecise', distance: null };
  if (!zone) return { kind: 'unplaced', distance: null };
  const distance = distanceMeters(zone, fix);
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
  }
  log(event, now) {
    this.events.push({ at: new Date(now).toISOString(), event });
    if (this.events.length > 100) this.events.shift();
  }
  clearDwell() { this.insideSince = null; this.insideSamples = 0; }
  start(now) { this.tracking = true; this.log('location-started', now); }
  stop(now) {
    this.tracking = false; this.fix = null; this.clearDwell();
    if (this.phase === 'ready') this.phase = 'return';
    this.log('location-stopped', now);
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
    return true;
  }
  place(radius, now) {
    const reading = classify(this.fix, null, now, this.config);
    if (!this.tracking || reading.kind !== 'unplaced' || !number(radius) || radius < 15 || radius > 100) return false;
    this.zone = { latitude: this.fix.latitude, longitude: this.fix.longitude, radius, placementAccuracy: this.fix.accuracy };
    this.phase = 'leave'; this.collectionCount = 0; this.clearDwell();
    this.log('treasure-placed-from-live-location', now);
    return true;
  }
  snapshot(now) {
    const reading = this.tracking ? classify(this.fix, this.zone, now, this.config) : { kind: 'stopped', distance: null };
    return { ...reading, phase: this.phase, eligible: this.phase === 'ready' && reading.kind === 'inside',
      canPlace: this.tracking && classify(this.fix, null, now, this.config).kind === 'unplaced' };
  }
  collect(now) {
    if (!this.snapshot(now).eligible) return false;
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
