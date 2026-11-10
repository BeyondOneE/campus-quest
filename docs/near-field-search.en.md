# Near-field search validation build

[中文](near-field-search.md) · 2026-11-05 · CQ-20261105-002

The top-right room menu offers **Outdoor** and **Indoor**. Switching starts a fresh room round. [RoNIN and mode switching](indoor-demo.en.md)

The user approved GPS approach followed by a locked, rotational camera search. This supersedes the final GPS-within-3-metre claim gate. Manual placement remains a testing aid; this is a virtual nearby encounter, without a surveyed physical anchor or inertial walking-distance estimate.

## Try it on iPhone Safari

1. Refresh the trusted LAN `/treasure-lab/` page. Create or join a room and enable location. The host hides a point. The default departure distance is 3 m. The host can adjust it under **Menu → Test tools** before placing the treasure.
2. Leave that departure boundary. On approach, at least two distinct fresh fixes within 15 m, spanning 2 seconds, lock a nearby encounter. Reported accuracy must still be at most 20 m to enter; entry uses centre distance, not a claim of measured 15 m physical accuracy.
3. Open AR and grant camera / motion permissions. Hold the phone still and upright to initialise, then turn to search. The target starts 45 degrees to the right in a newly calibrated local frame. The arrow leads to it; the chest enters / leaves view as the phone turns. It is not tied to a shared physical ground point.
4. Point at the chest and hold within 18° for at least 700 ms while the ring fills. Tap **Claim treasure** when it becomes available and wait for the result. Live video and distinct fresh orientation samples are required. Opening chat clears aim. Close it and aim again to claim.
5. Once locked, GPS jitter, weak accuracy, expiry or transient loss do not revoke the encounter. Its countdown is 90 seconds. A confirmed coarse departure—distance minus reported accuracy above 35 m on at least two fixes spanning 3 seconds—cancels it. Explicitly stopping location, closing / ending the camera, backgrounding, identity / room / round changes and server restart release the encounter. Camera permission failure keeps eligibility available for retry. Expiry / cancellation requires new stable nearby fixes; a delayed response cannot extend its old deadline.

For motion permission denial / interruption, retry permission or close and reopen AR to recalibrate after the area locks again. A gap over 500 ms in the raw gyro stream stops that frame instead of silently inventing missing rotation. Sensor drift, phone axes / screen rotation and real field accuracy still require the user's iPhone Safari test.

## Sensors and server authority

Preferred path: `devicemotion.rotationRate`, integrated as a quaternion in device axes. `accelerationIncludingGravity` initialises tilt; it is not integrated into position. No magnetometer heading is used in the local frame. If motion permission / API is unavailable but orientation access is granted, use browser-provided alpha / beta / gamma relative to a calibrated starting heading, ignoring `webkitCompassHeading` / accuracy. This fallback is browser-fused orientation, not a promise of raw gyro-only tracking. Distant approach still uses absolute direction.

The backend owns encounter eligibility, opaque ID, deadline, target offset and aim dwell. `state.nearField` is null or `{ id, expiresInMs, radius: 15, exitRadius: 35 }`. Nearby `guidance` has `frame: local`, `encounterId`, and `bearingDegrees: 45`; approach guidance has `frame: earth`. `state.expiresInMs` follows the encounter deadline while locked, otherwise GPS freshness. These are local-frame angles, not geographic treasure bearings.

Existing authenticated / CSRF / room / round routes remain:

- `POST /api/aim`: send the existing sample plus `source: local-gyro | relative-orientation`, `encounterId` and a stable `frameId`. The server binds the first valid calibration frame / source; mismatched / stale frames, wrong encounters and absolute-compass samples cannot unlock local claims. `sample: null` clears only aiming.
- To release a matching encounter: `POST /api/aim` with `{ roomCode, treasureId, sample: null, cancelEncounter: true, encounterId }`. A delayed cancellation for another ID does not cancel the current encounter.
- `POST /api/location/stop` with `{ roomCode, transient: true }` invalidates GPS but retains an already locked encounter; the default explicit stop releases it. No new route or persistent table was added.
- `POST /api/collect` still checks live-camera status, server-side hold and per-player / round receipts. It no longer checks a final 3 m GPS boundary. Phone-reported sensor / camera values remain experiment inputs, not anti-cheat proof.

No camera frames, raw accelerations / gyro rates or inferred walking path are uploaded. Only bounded aim pose / frame metadata uses the existing backend aim route. Account data, stored points, receipts, private key and development CA are preserved. Validation results are in the [daily record](../progress/en/daily/2026-11-05.md); no automated sample establishes physical acceptance.
