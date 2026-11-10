# Motion recording and offline comparison

[中文](motion-recording.md) · 2026-11-10 · CQ-20261110-005

In a room, open **Menu → Test tools → Motion recording**. The recorder is also available at `/treasure-lab/motion-recording.html` over the same trusted LAN HTTPS connection. The page records phone motion after **Start recording** and saves one JSON file when you tap **Export JSON**. It keeps the recording in tab memory. Backgrounding stops recording. Export before refreshing or starting another trial.

Record the two trials separately:

1. **Shake in place.** Start upright and hold still until **Mark start** is available. Tap it, keep your feet on the start mark, and move the phone. Tap **Mark end of shake** when you stop. Hold still for three seconds, tap **Mark settled**, then wait one second before stopping and exporting.
2. **Measured out and back.** Mark the start, halfway point and far end on a straight line, and enter the one-way distance in metres. Start upright with the phone facing the far end. Follow the marks for halfway out, arrival, far stop, halfway back, return and final stop. Tap the halfway marks as you pass them. Hold still for three seconds before each settled mark, and leave one second of recording after the final mark.

The file includes event and receipt times, interval, screen angle, linear and gravity-inclusive acceleration, angular rates, and timed reference marks. Missing readings are recorded as null. The recording page's network and hardware permissions restrict it to local motion capture. The export has no GPS, video, account or room data. Keep raw recordings in ignored local storage such as `.local/motion-trials/`.

## Replay on the computer

`node scripts/replay-motion.mjs RECORDING.json` replays the current game estimator and prepares gravity-aligned IMU features. The test computer has NumPy, CPU PyTorch and the upstream RoNIN source and ResNet18 weights under `.local/ronin-research/`. The weights are for non-commercial use and are kept in the ignored local directory. [RoNIN source](https://github.com/Sachini/ronin) · [Model archive and terms](https://doi.org/10.20383/102.0543)

```sh
.local/ronin-research/venv/bin/python scripts/compare-ronin.py RECORDING.json \
  --ios-motion \
  --ronin-repo .local/ronin-research/upstream \
  --checkpoint .local/ronin-research/resnet18.pt \
  --output .local/motion-trials/comparison.json
```

The comparator uses the same sensor recording and initial local axes for both algorithms. It supplies calibrated gyro in radians per second and gravity-inclusive acceleration to RoNIN, interpolates to 200 Hz, and integrates the predicted velocity at the centre of each one-second window. This follows the [upstream feature convention](https://github.com/Sachini/ronin/blob/master/source/data_glob_speed.py). Interpolation aligns timing and adds no sensor information. The report includes the original sample rate, moving RMS and maximum error, settled RMS error, marked-point errors and both trajectories. It aligns both tracks only at the start mark.

For shaking, the reference is the body remaining at the origin throughout the marked interval. For walking, measured positions are available only at manual marks. A manual mark has timing uncertainty. `--ios-motion` reads `alpha`, `beta`, `gamma` as gyro X, Y, Z and reverses the sign of both acceleration channels. Omit it to reproduce the original input. The live RoNIN demo uses the iPhone correction. [Replay results](../progress/en/daily/2026-11-10.md#cq-20261110-006--iphone-motion-replay-results)
