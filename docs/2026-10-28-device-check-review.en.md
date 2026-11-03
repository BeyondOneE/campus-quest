# 2026-10-28 iPhone browser test review

[中文](2026-10-28-device-check-review.md)

## Source and environment

- User-supplied `campus-quest-safari-2026-10-28T09-45-14-625Z.json`, SHA256 `f39d74388190c0bb1ecbe679466f164aa9412d0452dbc28bdf4d7455646e4fc5`.
- Session: 17:42:23–17:45:14 Beijing time; HTTPS secure context; viewport 402 × 760.
- UA includes `Safari/604.1 Brave`; the user explicitly confirmed **Brave**. This is not Safari acceptance.
- The old `targetBrowserDetected: true` was a false positive. Known alternative-browser tokens such as Brave are now excluded, and the positive label is only a candidate heuristic requiring user confirmation.
- The original report remains local and ignored by Git. This summary contains no precise coordinates, UDID or serial.

## Observations

| Check | Automatic record | User observation / conclusion |
| --- | --- | --- |
| Camera | Granted; rear `environment`; 1280 × 720; reported configuration 30 fps; 1896 observed frame updates; latest frame 22 ms before export | User checked continuous smooth rear video. The path worked in this Brave session. The 30 fps setting is not a full stability measurement |
| Orientation | 1723 valid samples; recently 60 Hz; latest sample 22 ms before export | Valid alpha / beta / gamma; orientation path worked. Relative orientation (`absolute: false`) |
| Rotation rate | 1724 valid samples; recently 60 Hz; latest sample 22 ms before export; rotation not all zero | Motion / rotation-rate path worked |
| Compass | Heading available; provider-reported heading accuracy around 10.03° | Establishes field availability, without checking actual direction |
| Location | 15 updates; no error; reported radius around 17.49 m | User marked position acceptable. System location worked in this session; not proof of metre-level or building-level accuracy |
| Background return | One background visit stopped collection; location, sensors and camera subsequently restarted | User marked recovery successful. Supports this stop-and-manually-restart flow, not continuous background collection |
| Relative clue | User checked response to turning; calibration events present | User feedback, translated: “The clue changes, but the effect is poor; everything else is fine.” Response observed, interaction quality not accepted |

Each feature's counters reset when restarted. The table retains the latest segment at export, not a continuous whole-session frame-rate or stability trace. No complete frame trajectory or objective drift measurement is present.

## Limits and next steps

1. Treat this only as supporting Brave evidence on the user's iPhone. Safari remains the first-stage acceptance target.
2. Ask the user to repeat camera, orientation, location and background recovery in system Safari and export a report.
3. Permission-denial recovery has no explicit physical test record; “everything else is fine” does not establish it.
4. The clue maps alpha / beta changes into clamped 2D offsets, without spatial anchors. Poor interaction cannot be attributed to insufficient sample rate from this evidence, nor declared fixed by changing coefficients alone.
5. Camera and orientation access does not complete real AR. Validate image / marker recognition or spatial tracking against the selected gameplay later.
