# Minimal location-based treasure experiment

[中文](treasure-lab.md)

On 2026-11-03 the user authorized “real location triggers treasure → present it in the camera view → tap to collect,” then required a computer-hosted backend connected to phone browsers from this stage onward. The entry is `/treasure-lab/`, separate from the six-screen demo and hardware diagnostics. Guest sessions, a shared single point across devices and persistent claims are implemented. Campus maps, zone editing, scheduled spawns, student verification and final multiplayer gameplay are not implemented. Local username / password registration, login and logout are now available; see the [account API](backend-api.en.md).

## Start and access

Run in the development repository:

```sh
npm start
```

Computer preview: `http://127.0.0.1:4180/treasure-lab/`, using the validated Node.js 24.19.0 runtime. Phone access now uses [direct LAN HTTPS setup](lan-access.en.md); configure its exact `PUBLIC_ORIGIN` on the backend and let the user manually install and trust the development certificate. A phone cannot use the computer's localhost address. Cloudflare remains off; no external relay or permanent deployment is used, and phone trust / reachability remain pending.

The Node service exposes nine allowlisted static files across both pages plus the [backend API](backend-api.en.md), without repository access, directory listing or arbitrary file upload. The Python service now serves only the original diagnostics. Vite or static build output alone cannot replace the business backend.

## Field procedure

1. Open the same HTTPS test URL in phone Safari, enter a nickname and tap “Create session”. Other phones enter the session code and their own nicknames, then tap “Join session”. You may first create an account or sign in. Signed-in players use their account username; returning to a previous room restores identity and receipts. Registration keeps the current guest room; login does not merge unrelated guest progress. Use trusted HTTPS before entering credentials.
2. At an outdoor site where you can walk away and return, read the location-sharing notice, tap “Start live location” and grant permission. Positions are sent to the computer backend for checks. Location and camera permission are never requested automatically.
3. Once the creator's location is valid, choose a collection radius and tap “Place shared treasure here”. Other players share this point. Only the creator can re-place it, starting a new round.
4. Each player keeps the page visible and walks outside until departure is confirmed, then returns near the centre to unlock the treasure. Poor accuracy, uncertain boundaries, stale samples or lost backend connectivity suspend collection.
5. Tap “Open camera” and grant permission. A clickable chest requires observed live video updates. Collection is rechecked and recorded by the backend before releasing the camera. The experiment allows each player one independent claim per round.
6. Expand “Field notes”, record actual observations and export the report. Reloading restores the cookie identity and backend claim; restart camera and location manually. Backend restart clears transient location observation but retains the shared point and claim receipts.

## Experiment parameters and gates

| Parameter | Initial value and rule |
| --- | --- |
| Collection radius | Defaults to 30 metres; adjustable from 15–100 metres |
| Location quality | Provider-reported accuracy at most 20 metres; placement and collection both require valid location |
| Position freshness | At most 15 seconds old; substantially future-dated samples are rejected |
| Confirm departure | Distance minus reported accuracy must reach the collection radius plus 10 metres |
| Confirm entry | Distance plus reported accuracy must be within the collection radius; at least two distinct-timestamp valid updates spanning at least 2 seconds |
| Allow collection | Departure and return confirmed; current entry conditions still met; video playing with an observed update within the last 2.5 seconds |

These values are starting parameters for a feasibility experiment, not final acceptance criteria approved by the user. The gates conservatively filter using reported uncertainty, but reported accuracy does not guarantee actual error. The treasure centre also comes from an uncertain system fix without survey calibration. Smaller radii may require better location quality. This page does not establish floor detection, exact physical-point matching or resistance to location spoofing.

## Lifecycle and privacy

- Backgrounding or leaving stops location, releases the camera and cancels pending camera acquisition. Restart manually on return. The page attempts to notify the backend to stop; if that notification fails, existing positions still expire by age.
- Losing valid location suspends collection and closes an active camera. Open it manually after conditions recover. After permission denial, adjust Safari website or system settings and retry.
- The camera provides a live background. The chest is a CSS game object without ground anchoring, road alignment or orientation tracking.
- Starting location sends coordinates to the computer backend. Shared treasure coordinates are saved in private SQLite; each player's latest fix stays in backend memory without a stored movement history. Stopping location or restarting the backend clears that fix. Video is never uploaded and reports still omit automatic coordinates. An external HTTPS relay can process forwarded traffic and needs explicit authorization first.
- Reports include experiment parameters, reported accuracy at placement, distance, state transitions, collection count, observed camera updates and user-written notes. Review notes before sharing. Raw reports are ignored by `.gitignore` and do not enter Git.

## Validation limits

Automated tests use isolated samples for logic, browser boundaries and two-client backend state, without injecting fake coordinates into the live page or running database. Desktop checks cover the English UI, real HTTP sessions, reload recovery and serving boundaries without granting hardware permissions for the user. A phone HTTPS entry and the Safari field procedure remain necessary to assess triggers, location fluctuations, camera experience and recovery. Passing automation and builds does not establish multi-phone or campus acceptance.
