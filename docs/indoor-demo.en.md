# Indoor RoNIN and mode switching

[中文](indoor-demo.md) · Updated 2026-11-11, CQ-20261110-007 through CQ-20261110-011 and CQ-20261111-017

In a room at `/treasure-lab/`, the host chooses **Outdoor** or **Indoor** from the top-right menu. If a treasure is already placed, **Keep current mode** returns to the menu and **Switch and reset round** removes the treasure and clears that round’s claims and eligibility. Mode persists across reload and server restart. On upgrade, rooms in either retired indoor mode reopen in GPS with a fresh round and an empty placement. The migration preserves room identity, ownership, memberships and historical receipts.

## Indoor RoNIN demo

The backend accepts Indoor requests from its configured `PUBLIC_ORIGIN`, including a public HTTPS domain. The server needs the RoNIN Python environment, upstream model source and checkpoint. Motion windows go to that game server for inference. Camera video stays on the phone. Each request requires the room host and a valid session CSRF token.

1. Open the game at its trusted HTTPS address in iPhone Safari. Choose **Indoor**, tap **Enable motion**, and hold the phone upright and still until **Hide treasure here** is available.
2. Hide the treasure, open **AR radar** and walk away. Pause once the estimated offset reaches 0.7 m to confirm departure. Walk back towards the hiding spot. The search opens after one second within the estimated 0.5 m return radius. Keep the phone near the original height and tilt the camera to centre the chest. Keep pointing at the chest while the ring fills, then tap **Claim treasure** when it becomes available.
3. If motion is interrupted, enable it again and hide the treasure in the new frame. The radar and camera use the same iPhone-corrected frame as the displacement estimate.

The phone aligns accelerometer and gyro features to gravity. The computer runs the same ResNet18 checkpoint and 200 Hz interpolation used by the offline comparison. It predicts velocity from one-second windows at a 50 ms stride and the phone integrates the estimates. Positions arrive in batches about every 200 ms. The window midpoint introduces about 500 ms of delay before batching and processing. The chest sits 0.25 m below the assumed camera height and the radar has a 5 m radius.

The phone tests for stillness over 400 ms centred on the time of each velocity prediction. The RMS limits are 0.35 m/s² for linear acceleration and 12°/s for rotation. At confirmed stops it integrates zero velocity, including when the model predicts a residual speed. Earlier walking estimates can still arrive after the player stops. The model continues estimating motion during walking, shaking and turns. Aiming also checks that current motion readings are steady.

Entering nearby search fixes the camera aim for that encounter. The target uses up to 35° of downward tilt. Within 0.1 m of the hiding spot it uses the last usable approach bearing, or the current heading if none is available. The radar still shows the live estimated floor bearing and range. It draws the gold chest dot above the player arrow when the two overlap and shows an edge arrow beyond 5 m.

The host needs the Python environment, upstream source and checkpoint under `.local/ronin-research/`. `./start.sh` starts the existing computer service and its optional local inference worker. The research checkpoint stays on the computer for the non-commercial course demonstration. [Model archive and terms](https://doi.org/10.20383/102.0543) · [iPhone recording and comparison](motion-recording.en.md)

## Reference implementations and evaluation

- RIDI learns a velocity estimate from phone IMU windows and uses it to correct acceleration before double integration. The research repository includes C++ and Python code. [RIDI project and data](https://yanhangpublic.github.io/ridi/index.html) · [Code](https://github.com/higerra/ridi_imu)
- RoNIN learns pedestrian movement from phone IMU readings and evaluates against body trajectory. It provides code, more than 40 hours of recorded data and weights for research use. [RoNIN project](https://ronin.cs.sfu.ca/) · [Code](https://github.com/Sachini/ronin)
- IMUNet provides an Android implementation for data collection and model evaluation. Aalto's phone odometry study is a reference for a classical estimator with online bias estimation and zero-velocity updates. [IMUNet Android code](https://github.com/BehnamZeinali/IMUNet_Android) · [Aalto phone odometry study](https://arxiv.org/abs/1703.00154)

To compare these approaches for this project, replay the same iPhone Safari recordings from known-length routes, stops and hand movement in place. Compare the error during movement, the error after each stop, and the return-to-origin error. Treat dataset results as reference benchmarks until the browser's timing, units and axes are validated on the demo phone.

Use **Menu → Test tools** for the motion recorder and the host’s estimated chest offset. Horizontal acceleration integration is available as an offline comparison baseline. [Motion recording and offline replay](motion-recording.en.md)

## Estimation limits and interruptions

RoNIN uses the host phone’s local motion frame. The camera projection assumes the calibration height, and the position estimate can drift. Guests observe the room state. In GPS mode, players can use the shared location-based flow.

Backgrounding or stopping motion cancels the encounter and releases the sensors. If valid samples have a gap greater than 100 ms, enable motion again and place the chest in the new frame. Stale or implausible estimates and mismatched frames cannot unlock a claim.

## API / data

New rooms start in Indoor (`indoor-ronin`). Joining or resuming a room uses its saved mode. Rooms that predate mode support use Outdoor (`gps`). The game envelope reports the mode in `room.mode` and `state.mode`.

- `POST /api/mode` takes `{ roomCode, treasureId, mode }` under the existing authentication / CSRF / Origin / JSON rules. The host receives the reset state. `indoor-ronin` requires the local network and model files. An unavailable model leaves the current round in place.
- `POST /api/ronin` accepts `{ roomCode, frames, startMs, count }` only from the host in RoNIN mode on the LAN or loopback origin. Each frame contains relative milliseconds, three gyro axes in rad/s and three gravity-inclusive acceleration axes in m/s², all in the local frame. The request covers one to eight consecutive windows, with a 48 KiB limit and a 100 ms maximum sample gap. It returns `{ velocities: [[vx, vy], ...] }` in m/s in window order. The request uses the same session and CSRF checks as the other game APIs. Missing runtime dependencies return `RONIN_UNAVAILABLE`.
- `POST /api/indoor` accepts `{ roomCode, treasureId, fix }` from the host in a RoNIN room and returns state plus `accepted`. Fixes use source `ronin-imu` and include `frameId`, `timestamp`, `x`, `y`, `heading` and Boolean `stationary`. Displacement is bounded by a speed of 3 m/s with 0.02 m tolerance. Local coordinates are bounded to ±20 m and age to 1500 ms.
- In RoNIN near search, `state.guidance.frame` is `indoor` and includes `pitchDegrees` as well as `bearingDegrees`. Aim and collection require fresh motion from the placement frame and a live encounter and camera feed. Aiming uses an 18° cone and a 700 ms hold. The hold restarts if the estimated horizontal position moves more than 0.20 m from its start.
- In RoNIN near search, `bearingDegrees` and `pitchDegrees` describe the fixed camera target. The additional `radarBearingDegrees` and live `distanceMeters` locate the hiding spot on the radar.
- GPS and indoor position submissions are restricted to their corresponding modes (`MODE_CHANGED`). In RoNIN mode the short feature batches are processed on the computer in memory. Local position estimates and aim samples use the existing game routes. The ignored database stores the placed local point and frame. The phone keeps the camera feed and raw motion recording.
- `GET/POST /api/guide` context adds `positionMode`, `distanceLabel`; indoor `gps: not-used`, `place: null`, explicitly estimated distance. Automatic GPS / arrival events are suppressed indoors. No real model call is required by mode switching.

There are 19 API routes, 15 public allowlisted files and 146 IDs in the game DOM contract. [RoNIN and mode migration validation](../progress/en/daily/2026-11-10.md)
