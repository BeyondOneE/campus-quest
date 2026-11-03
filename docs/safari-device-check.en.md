# Physical iPhone Safari validation

[中文](safari-device-check.md)

Target device: USB-reported `iPhone18,1`, iOS `27.2`, build `24B5089g`. USB identification establishes only basic fields, not Safari hardware acceptance.

## Open the page

1. Run `python3 scripts/serve_device_check.py` on the computer and keep it running.
2. Forward a configured HTTPS entry to `http://127.0.0.1:4174`. For a Cloudflare Quick Tunnel, use `cloudflared tunnel --url http://127.0.0.1:4174`.
3. Open the generated HTTPS address at `/device-check/` in the iPhone's system **Safari**.
4. Check the secure-context indicator and have the user confirm the actual app. The page infers Safari-like characteristics from the UA; its label does not prove browser identity. No USB connection or Developer Mode is required.

Temporary tunnels have no uptime guarantee and stop working when closed. Only four static diagnostic assets are served. The tunnel provider can see ordinary page-access network metadata, but the page does not upload coordinates, sensor data or camera frames. Decide production hosting separately.

## Check sequence

| Check | Action | Record |
| --- | --- | --- |
| Camera | Start, grant permission and observe for 30 seconds | Rear lens, smoothness, continued updates and reported resolution |
| Orientation and motion | Authorize; slowly turn left / right and tilt forward / back | Alpha / beta / gamma, both sampling rates, rotation rate and compass availability |
| Relative view | Start camera and sensors, calibrate, then turn | Whether the clue responds to relative view; recalibrate after screen rotation |
| Location | Start location; wait in an open outdoor area if needed | Coordinates, reported accuracy and waiting time; not measured position error |
| Concurrent operation | Keep camera, sensors and location foregrounded for about 60 seconds | Video stutter, stalled data and noticeable heat as user observations |
| Denial recovery | Deny a permission, check Safari website / system settings, then allow and retry | Actual recovery steps and result |
| Background return | Switch apps or lock, then return | Collection stops; check manual restart. No continuous background operation is promised |
| Report | Check only actual observations, add notes and export JSON | Coordinates excluded by default; leave untested items unchecked |

The browser may not prompt again after denial. The user adjusts website or system settings; scripts do not bypass authorization.

## Evidence and limits

- A missing `requestPermission()` does not alone mean the API is unavailable; check subsequent valid samples.
- Motion events with all-null `rotationRate` do not establish gyro rotation data.
- The clue visualizes relative rotation, without spatial anchors, building recognition or real navigation.
- Location may be system-fused rather than GPS. `accuracy` is a provider-reported confidence radius.
- Reports exclude exact coordinates by default and do not upload. Review a coordinate-inclusive report before sharing.
- Simulated test samples are not physical-phone results. Actual observations and exported records support acceptance.

## References

- [Camera access and secure contexts](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Orientation, motion and user-gesture permission](https://developer.mozilla.org/en-US/docs/Web/API/Device_orientation_events/Detecting_device_orientation)
- [Location accuracy](https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates/accuracy)
- [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)
