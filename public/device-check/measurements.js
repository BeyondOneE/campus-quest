export function finite(value) { return typeof value === 'number' && Number.isFinite(value); }
// Several iOS browsers include Safari tokens. This is only a candidate check;
// absence of a known alternative-browser token does not prove the app is Safari.
export function isIPhoneSafariCandidate(userAgent) {
  return /iPhone/i.test(userAgent) && /Version\/[\d.]+/i.test(userAgent) && /Safari\//i.test(userAgent)
    && !/Brave|CriOS|FxiOS|EdgiOS|MicroMessenger|OPiOS|DuckDuckGo/i.test(userAgent);
}
export function angleDelta(value, reference) { return ((value - reference + 540) % 360 + 360) % 360 - 180; }
export function frequency(timestamps, now, windowMs = 2000) {
  const recent = timestamps.filter(t => now - t <= windowMs && t <= now);
  return recent.length < 2 ? 0 : (recent.length - 1) * 1000 / Math.max(1, recent.at(-1) - recent[0]);
}
export function channelHealth(channel, now, staleMs = 2500) {
  if (!channel.validCount) return 'waiting';
  return now - channel.lastAt > staleMs ? 'stale' : 'live';
}
export function summary(channel, now) {
  return { permission: channel.permission, running: channel.running, events: channel.events,
    validSamples: channel.validCount, lastSampleAgeMs: channel.lastAt === null ? null : Math.round(now - channel.lastAt),
    recentHz: Number(frequency(channel.timestamps, now).toFixed(1)), health: channelHealth(channel, now) };
}
export function locationForReport(location, includeCoordinates) {
  if (!location) return null;
  const { latitude, longitude, ...rest } = location;
  return includeCoordinates ? { ...rest, latitude, longitude } : rest;
}
