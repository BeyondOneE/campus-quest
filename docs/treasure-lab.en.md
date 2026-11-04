# Minimal location-based treasure experiment

[中文](treasure-lab.md)

On 2026-11-03 the user authorized “real location triggers treasure → present it in the camera view → tap to collect,” then required a computer-hosted backend connected to phone browsers from this stage onward. The entry is `/treasure-lab/`, separate from the six-screen demo and hardware diagnostics. Guest sessions, a shared single point across devices and persistent claims are implemented. Campus maps, zone editing, scheduled spawns, student verification and final multiplayer gameplay are not implemented. Local username / password registration, login and logout are now available; see the [account API](backend-api.en.md).

## Start and access

Run in the development repository:

```sh
./start.sh
```

Computer preview: `http://127.0.0.1:4180/treasure-lab/`, using the validated Node.js 24.19.0 runtime. Phone access now uses [direct LAN HTTPS setup](lan-access.en.md); configure its exact `PUBLIC_ORIGIN` on the backend and let the user manually install and trust the development certificate. A phone cannot use the computer's localhost address. Cloudflare remains off; no external relay or permanent deployment is used, and phone trust / reachability remain pending.

The Node service exposes eleven allowlisted static files across both pages plus the [backend API](backend-api.en.md), without repository access, directory listing or arbitrary file upload. The Python service now serves only the original diagnostics. Vite or static build output alone cannot replace the business backend.

## Field procedure

1. Open the same HTTPS test URL in phone Safari, tap “Create a room” and enter a nickname. Other phones tap “Join with a code” and enter the room code and their own nicknames. You may first create an account or sign in. Signed-in players use their account username; returning to a previous room restores identity and receipts. Registration keeps the current guest room; login does not merge unrelated guest progress. Use trusted HTTPS before entering credentials.
2. At an outdoor site where you can walk away and return, read the location-sharing notice, tap “Turn on location” and grant permission. Positions are sent to the computer backend for checks. Location and camera permission are never requested automatically.
3. Once the creator's location is valid, choose a collection radius and tap “Hide treasure here”. Other players share this point. Only the creator can move it, from the menu or after claiming, which starts a new round.
4. Keep the page visible and walk outside until departure is confirmed. Tap “Open AR directions” and allow the rear camera and Motion & Orientation. Follow the arrow back, with the phone upright and the rear camera towards the horizon. The arrow points directly towards the target, without road routing.
5. On a stable in-range return, a chest appears only when its virtual direction enters the view. Centre it in the reticle and hold steady for about 1.2 seconds, then tap “Claim treasure”. Turning away, old compass readings or stalled video disable Claim. Poor accuracy, boundary uncertainty or disconnection also suspend collection. The backend rechecks both location and aim before recording one claim per player per round and releasing the camera.
6. Open “Field notes” from the top-right menu, record actual observations and export the report. Reloading restores the cookie identity and backend claim; restart camera and location manually. Backend restart clears transient location observation but retains the shared point and claim receipts.

## Experiment parameters and gates

| Parameter | Initial value and rule |
| --- | --- |
| Collection radius | Defaults to 3 metres; adjustable from 3–100 metres |
| Location quality | Provider-reported accuracy at most 20 metres; placement and collection both require valid location |
| Position freshness | At most 15 seconds old; substantially future-dated samples are rejected |
| Confirm departure | At 3 m: reported centre distance must exceed 3 m; larger radii retain distance minus accuracy ≥ radius plus 10 m |
| Confirm entry | At 3 m: reported centre distance at most 3 m; larger radii include uncertainty. Two distinct valid readings spanning at least 2 seconds |
| Camera navigation | Confirmed departure and valid fresh location, including outside / boundary |
| Allow collection | Confirmed stable return; still in range; frame age at most 750 ms; direction age at most 1500 ms; aim within 10° for at least 1200 ms |
| Aim hold | At least three distinct samples, gaps at most 900 ms; measured by backend receipt time, plus an independent phone-side check |

These values are starting parameters for a feasibility experiment, not final acceptance criteria approved by the user. The gates conservatively filter using reported uncertainty, but reported accuracy does not guarantee actual error. The treasure centre also comes from an uncertain system fix without survey calibration. Smaller radii may require better location quality. This page does not establish floor detection, exact physical-point matching or resistance to location spoofing.

## Lifecycle and privacy

- Backgrounding or leaving stops location, releases the camera and cancels pending camera acquisition. Restart manually on return. The page attempts to notify the backend to stop; if that notification fails, existing positions still expire by age.
- Losing valid location pauses collection but retains an active camera, with a GPS spinner and automatic watch recovery. Fresh position and aim resume gameplay. After permission denial, adjust Safari website or system settings and retry.
- The camera provides a live background. The chest follows absolute rear-camera orientation and screen rotation. Near-range direction is locked on approach to reduce GPS jitter; this virtual target has no ground anchoring, visual SLAM, surveyed physical-point matching or road alignment.
- Starting location sends coordinates to the computer backend; aiming also sends transient orientation / frame-age readings. Shared treasure coordinates are saved in private SQLite; each player's latest fix stays in backend memory without a stored movement history. Stopping location or restarting the backend clears that fix. Video is never uploaded and reports still omit automatic coordinates. An external HTTPS relay can process forwarded traffic and needs explicit authorization first.
- Reports include experiment parameters, reported accuracy at placement, distance, state transitions, collection count, observed camera updates and user-written notes. Review notes before sharing. Raw reports are ignored by `.gitignore` and do not enter Git.

## Validation limits

Automated tests use isolated samples for logic, browser boundaries and two-client backend state, without injecting fake coordinates into the live page or running database. Desktop checks cover the English UI, real HTTP sessions, reload recovery and serving boundaries without granting hardware permissions for the user. A phone HTTPS entry and the Safari field procedure remain necessary to assess triggers, location fluctuations, camera experience and recovery. Passing automation and builds does not establish multi-phone or campus acceptance.

## Current test scope and next field check

Manual owner placement is retained for convenient testing. The user's intended product will generate treasures through the system or let staff place them; neither production placement workflow exists yet. See CQ-20261104-008 and the [aim API](backend-api.en.md#ar-guidance-and-aim-contract-2026-11-04).

In Safari outdoors, check the arrow against a known landmark in several headings, turn away and back, tilt / rotate the phone, approach through the boundary, hold / break aim, deny and retry orientation, then background and restart. Record magnetic disturbance, GPS swings, targeting jitter and actual Claim behavior in Field notes. If Motion & Orientation is denied, use “Enable direction” after checking permissions. No compass, stale pose or poor compass accuracy withholds Claim; location-only collection is not a fallback. These physical results remain unavailable.

Camera companion: tap **Chat with guide** for text / quick questions. While closed, it can introduce configured buildings / courses and report distance about every 30 seconds. Current campus data and provider key are not filled in; presets are visibly labelled. See [setup and content fields](ai-guide.en.md). Three-metre mode uses approximate reported distance and can be affected by GPS drift; the old 10 m buffer does not apply at 3 m. Existing saved points were migrated with a private backup; no claim was removed.
