import test from 'node:test';
import assert from 'node:assert/strict';
import { finite, angleDelta, frequency, channelHealth, locationForReport, isIPhoneSafariCandidate } from '../public/device-check/measurements.js';

test('the supplied iPhone Brave UA is not counted as a Safari candidate', () => {
  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1 Brave';
  assert.equal(isIPhoneSafariCandidate(ua), false);
  assert.equal(isIPhoneSafariCandidate(ua.replace(' Brave','')), true);
});
test('known alternative iOS browser tokens and desktop Safari are excluded', () => {
  const base = 'iPhone Version/27.2 Mobile Safari/604.1';
  for (const token of ['CriOS','FxiOS','EdgiOS','MicroMessenger','OPiOS','DuckDuckGo']) assert.equal(isIPhoneSafariCandidate(`${base} ${token}`), false);
  assert.equal(isIPhoneSafariCandidate('Macintosh Version/27.2 Safari/604.1'), false);
  assert.equal(isIPhoneSafariCandidate('iPhone Mobile Safari/604.1'), false);
});

test('null sensor fields are not valid samples, zero rotation is valid', () => {
  for (const value of [null, undefined, NaN, Infinity, '0']) assert.equal(finite(value), false);
  assert.equal(finite(0), true);
});
test('relative view crosses north without a 358-degree jump', () => {
  assert.equal(angleDelta(1, 359), 2);
  assert.equal(angleDelta(359, 1), -2);
  assert.equal(angleDelta(90, 90), 0);
});
test('frequency reflects observed samples and drops to zero after a gap', () => {
  assert.equal(frequency([0, 50, 100], 100), 20);
  assert.equal(frequency([0, 50, 100], 4000), 0);
  assert.equal(frequency([0], 100), 0);
});
test('permission or event availability never substitutes for valid sensor data', () => {
  assert.equal(channelHealth({validCount: 0, lastAt: null}, 100), 'waiting');
  assert.equal(channelHealth({validCount: 2, lastAt: 100}, 200), 'live');
  assert.equal(channelHealth({validCount: 2, lastAt: 100}, 3000), 'stale');
});
test('export excludes exact coordinates unless explicitly selected', () => {
  const location = {latitude: 31.123456, longitude: 121.123456, accuracyMeters: 10, timestamp: 'test'};
  assert.deepEqual(locationForReport(location, false), {accuracyMeters: 10, timestamp: 'test'});
  assert.deepEqual(locationForReport(location, true), location);
  assert.equal(locationForReport(null, false), null);
  assert.equal(location.latitude, 31.123456);
});
