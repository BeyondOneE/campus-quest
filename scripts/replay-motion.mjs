import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { IndoorPlanar } from './planar-baseline.mjs';
import { trialMarks } from '../public/treasure-lab/motion-recording.js';
import { normalizeIosMotion } from '../public/treasure-lab/ronin.js';

export function replayMotion(recording, { iosMotion = false } = {}) {
  if (recording?.kind !== 'campus-quest-motion-recording' || recording.schemaVersion !== 1
    || !Array.isArray(recording.samples) || !Array.isArray(recording.marks)) {
    throw new Error('Expected a Campus Quest motion recording JSON file.');
  }
  const plan = trialMarks(recording.trial, recording.distanceMeters);
  if (!plan || recording.marks.length !== plan.length || recording.marks.some((mark, i) =>
    mark.id !== plan[i].id || mark.phase !== plan[i].phase || mark.x !== 0 || mark.y !== plan[i].y
    || !Number.isFinite(mark.tMs) || mark.tMs < 0 || (i > 0 && mark.tMs <= recording.marks[i - 1].tMs))) {
    throw new Error('Record the full trial, including all waypoint marks, before comparing.');
  }
  const tracker = new IndoorPlanar();
  const trace = [];
  let missingTimestamps = 0;
  let lastReceived = -Infinity;
  for (const sample of recording.samples) {
    if (!Number.isFinite(sample.receivedMs) || sample.receivedMs < lastReceived || sample.receivedMs < 0) {
      throw new Error('The recording has invalid receipt times.');
    }
    lastReceived = sample.receivedMs;
    if (!Number.isFinite(sample.sampleMs)) missingTimestamps++;
    const event = iosMotion ? normalizeIosMotion(sample, sample.sampleMs) : { ...sample, timeStamp: sample.sampleMs };
    const fix = tracker.observe(event, sample.receivedMs, sample.screenAngle);
    if (fix.error) continue;
    const tMs = sample.sampleMs ?? sample.receivedMs;
    const features = tracker.features(event);
    const row = { tMs, x: fix.x, y: fix.y, stationary: fix.stationary, features };
    if (trace.at(-1)?.tMs === tMs) trace[trace.length - 1] = row;
    else trace.push(row);
  }
  if (trace.length < 2 || trace[0].tMs > recording.marks[0].tMs || trace.at(-1).tMs < recording.marks.at(-1).tMs) {
    throw new Error('Motion coverage is incomplete. Keep Safari open, start still, and record for a second after the final mark.');
  }
  return { trial: recording.trial, marks: recording.marks, samples: recording.samples.length, missingTimestamps, trace };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    if (!process.argv[2]) throw new Error('Usage: node scripts/replay-motion.mjs RECORDING.json [--ios-motion]');
    const recording = JSON.parse(readFileSync(process.argv[2], 'utf8'));
    process.stdout.write(JSON.stringify(replayMotion(recording, { iosMotion: process.argv.includes('--ios-motion') })) + '\n');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
