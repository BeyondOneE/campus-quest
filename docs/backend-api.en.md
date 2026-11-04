# Computer-hosted backend API

[中文](backend-api.md)

## Running and identity

Use the validated Node.js 24.19.0 runtime. Run `./start.sh` from the repository for background backend + LAN HTTPS startup, health checks and log management; see [launcher commands](lan-access.en.md#one-command-startup). Manual backend-only startup remains `npm start`. The application listens at `http://127.0.0.1:4180/treasure-lab/` and serves the English page plus the API from the same origin. SQLite data is kept in ignored `.local/campus-quest.sqlite`. The Python diagnostic server is separate and provides no business API.

Players can register a local username / password account or continue as temporary guests. Accounts preserve room membership and receipts across devices. Guest identities still use a nickname and an eight-character room code. Neither option verifies student identity. Browser sessions expire after 24 hours; account credentials and membership persist in SQLite. Use different browser profiles or phones for different signed-in users.

Guest room creation / joining sets `cq_session`; account registration / login sets `cq_account`. Both cookies are HttpOnly and SameSite=Strict, with Secure on HTTPS. Successful account and game responses include `csrfToken`; include it as `X-CSRF-Token` on authenticated POST requests. Account mutations use the browser session's own token, including room changes and logout. An expired account cookie never silently falls back to a guest. Do not store or print cookie / CSRF values in handoff records.

## Accounts

Account envelope example after registration without a guest room (documentation-only values). Signed-out success is `{ "account": null, "rooms": [], "activeRoom": null }` and omits `csrfToken`. With an active membership, `activeRoom` is its room code and `rooms` contains `{ code, role }` entries. Registration / login do not return a game envelope; read `/api/state` for that room afterward.

```json
{
  "account": { "id": "example-account", "username": "explorer" },
  "csrfToken": "<csrf-token-from-response>",
  "activeRoom": null,
  "rooms": []
}
```

| Method and path | JSON body / result |
| --- | --- |
| `GET /api/auth/session` | `{ account: { id, username }, csrfToken, activeRoom, rooms: [{ code, role }] }`; signed out returns `account: null`, empty rooms and no CSRF token |
| `POST /api/auth/register` | `{ username, password }`; HTTP 201, signs in and returns the account envelope |
| `POST /api/auth/login` | `{ username, password }`; HTTP 200, new browser session and the account envelope |
| `POST /api/auth/logout` | `{}`; HTTP 200, revokes this account session, releases its temporary location state and clears both cookies; other devices remain signed in |

Usernames contain 3–32 ASCII letters, digits or underscores and are stored lowercase. Passwords contain 1–128 Unicode code points with no strength rule beyond length (user decision, 2026-11-04); spaces are preserved. Passwords are never returned or logged. The server uses asynchronous salted scrypt (`N=131072, r=8, p=1`, 16-byte random salt); at most two password operations run concurrently. See [OWASP password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) and [Node crypto](https://nodejs.org/download/release/latest-v24.x/docs/api/crypto.html). Test-server limits are 1,000 accounts, eight live sessions per account, 20 auth attempts per address per 15 minutes and eight per canonical username per 15 minutes. Rate windows are in memory and reset on restart. Excess concurrent work returns 429 `AUTH_BUSY`.

Registration with a valid guest cookie and its CSRF token associates that guest's current room, player ID, owner role and receipts with the new account. The old guest token stops authenticating that player. Login restores the account's most recently used room; it does not merge an unrelated guest's progress. Joining an existing account room restores the same player instead of creating another membership. Accounts may belong to several rooms; the active room belongs to the browser login session. Each device has separate temporary location gates, and login does not restore old location or start hardware. Receipts are shared across devices, so duplicate collection returns the original receipt.

After sign-in without a room, use room creation / joining before `GET /api/state` (otherwise 409 `ROOM_REQUIRED`). Signed-in room requests do not require `name`; the server uses the account username. Every signed-in gameplay POST must include the observed `roomCode` as well as the existing payload; a changed room returns 409 `ROOM_CHANGED`. Guests may also send `roomCode`. Wrong passwords and unknown users return the same 401 `INVALID_CREDENTIALS`; invalid input returns 400, duplicate usernames 409, and expired logins 401 `ACCOUNT_SESSION_EXPIRED`.

This is local password authentication, without email verification, student SSO, password recovery, account deletion or profile editing. Use trusted HTTPS on the phone. The current UI is a minimal English integration view; visual design remains Claude's responsibility.

## Routes

| Method and path | JSON body / result |
| --- | --- |
| `GET /api/health` | Public readiness: `{ ok, service, version }` |
| `POST /api/rooms` | Guest: `{ name }`; account: `{}` with account CSRF. Creates a room and owner; HTTP 201 state envelope |
| `POST /api/rooms/join` | Guest: `{ name, code }`; account: `{ code }` with account CSRF. HTTP 201 state envelope; restores existing account membership |
| `GET /api/state` | Current player, room, roster, location gates and receipt |
| `GET /api/guide` | Separate authenticated guide context / history; see [guide contract](ai-guide.en.md) |
| `POST /api/guide` | `{ roomCode, treasureId, message }` or `{ roomCode, treasureId, event }`; separate guide response |
| `POST /api/location` | `{ roomCode, treasureId, fix: { latitude, longitude, accuracy, timestamp } }`; HTTP 200 state plus `accepted: boolean` |
| `POST /api/location/stop` | `{ roomCode }`; HTTP 200 state; clears this session's latest position / entry observation |
| `POST /api/treasure` | `{ roomCode, treasureId, radius }`; owner only; HTTP 200 state for a new shared round placed from the latest valid fix |
| `POST /api/aim` | `{ roomCode, treasureId, sample }`; HTTP 200 state plus `accepted: boolean`; `sample: null` clears aim |
| `POST /api/collect` | `{ roomCode, treasureId, cameraLive: true }`; HTTP 200 state plus `collection: { id, collectedAt, repeated }` |

Creation and joining return HTTP 201; other successes return 200. State envelopes contain `serverTime`, `csrfToken`, `room`, `player`, `state`, `report`, `receipt` and `players`. Room data includes the eight-character code, current `treasureId`, radius, placement flag, player count and `one-claim-per-player` policy. No endpoint returns stored treasure coordinates or another player's latest coordinates. `state` includes `kind`, `phase`, `distance`, `eligible`, `canNavigate`, `guidance`, `aim`, `canClaim`, `canPlace` and `expiresInMs`. Receipt fields are `id` and `collectedAt`; duplicate collections return the original receipt with `repeated: true`.

When no treasure is placed, `treasureId` is null. Mutation requests carry the currently observed value; after replacement, requests with an old value return 409 `TREASURE_CHANGED`. Poll state to recover, then send a fresh location. Replacement starts a new round without deleting old receipts. Only the creator may replace a treasure; every participant can claim the current treasure once independently. This is an experimental rule, not a finalized multiplayer design.

Error responses are `{ error: { code, message } }`, with English messages. Important statuses are 400 invalid input, 401 missing / expired identity, 403 origin / CSRF / owner rejection, 404 missing session or route, 409 changed room / treasure or unmet location gates, 413 oversized body, 415 wrong content type and 429 test-server limits. There are no CORS allow headers. POST requires JSON and an allowed Origin. The HTTP body limit is 8192 bytes; rooms allow 16 active players, and session creation / joining is limited to 20 requests per minute per connection address. The LAN proxy overwrites the forwarded client address; the loopback-only backend trusts that local proxy. Another proxy must preserve this boundary.

## Frontend adapter and location behavior

Use [RemoteTreasureSession](../public/treasure-lab/client.js), not a browser-local `TreasureSession`, as the product authority. It exposes asynchronous `resume()`, `connect(name, code)`, `receive(fix)`, `place(radius)`, `aim(sample)`, `collect()` and `refresh()`; `start(now)` / `stop(now)` mirror hardware state and `snapshot(now)` / `report(now)` render cached server results. The current controller polls every 2 seconds while visible. Network failures suspend collection; late responses after stopping cannot reactivate local tracking. The camera lifecycle remains on the phone and must retain its permission, frame-update and background-stop gates.

For accounts use `authenticate('register' | 'login', username, password)` and `logout()`; render `account` and `accountRooms`. `resume()` resolves account state before restoring gameplay. CSRF tokens stay in memory, cookies remain HttpOnly, and the view clears the password field immediately after submission. Identity changes and expired logins stop hardware. Never put passwords or tokens into localStorage, reports or UI errors.

The backend reuses the tested location model: initial radius 3 metres, adjustable 3–100; accuracy threshold 20 metres, exit buffer 10 metres, fresh fix age at most 15 seconds, return observation at least 2 seconds across distinct readings. These are experiment settings. Client coordinates and `cameraLive` are untrusted reports, so this is not anti-cheat or proof of camera use. Backend checks prevent normal UI bypass and duplicate claims; physical accuracy remains to be tested.

## Persistence, privacy and HTTPS

SQLite persists accounts, password hashes, login sessions, guest identities, room membership, shared treasure coordinates and claim receipts. Schema migration preserves legacy IDs and receipts; a private database backup was made before the running service upgrade. Each browser session's latest fix and observation state are held in server memory, without a stored movement history; stopping clears that fix, and restart loses all transient location state. Claims and the shared point survive restart. Private storage is ignored by Git. Camera video never leaves the phone. Exported reports do not automatically contain coordinates; review user-written notes before sharing.

The current phone approach is [direct LAN HTTPS](lan-access.en.md), without an external relay. The computer provides a local certificate setup page and HTTPS proxy; the phone user must install and trust the development certificate manually before hardware testing. Set `PUBLIC_ORIGIN` to that exact HTTPS origin, without a path or trailing slash, while the backend remains on port 4180. Phone trust and reachability are not yet confirmed. The earlier Cloudflare Quick Tunnel was rejected by automatic review and remains off; enabling any external provider later would still need explicit authorization of its data handling.

Only eleven public static files and the listed API are served. Repository source, private storage and configuration paths are not exposed. This remains a development server on the user's computer, not production hosting or a complete multiplayer product.


## Frontend request sequence

For new presentation code prefer the adapter to direct fetch. This example handles account / room connection only; it does not open hardware or implement a full page:

```js
import { RemoteTreasureSession } from '/treasure-lab/client.js';

const session = new RemoteTreasureSession();
await session.resume();
// Render session.account, session.connected, session.data and session.lastError.
// Run these only in the corresponding user-action handlers, not at startup:
async function signIn(username, password) {
  return await session.authenticate('login', username, password);
}
async function createRoom(guestNickname) {
  return await session.connect(guestNickname); // name is ignored for accounts
}
async function joinRoom(code, guestNickname = '') {
  return await session.connect(guestNickname, code.trim().toUpperCase());
}
```

On startup, `resume()` reads `/api/auth/session`. With a signed-in account and no `activeRoom`, render room selection. With an account room, or no account (possible guest), it reads `/api/state`. A new visitor's `SESSION_REQUIRED` is an expected signed-out / no-room state. An expired account session remains an explicit sign-in requirement. `GET /api/state` has no `account` field: use the account envelope / adapter's `account`, not `player.role`, to determine authentication.

For direct HTTP clients: use same-origin relative URLs and `credentials: 'same-origin'`; POST JSON only. Browsers set the `Origin` header themselves. Keep the newest successful account / game `csrfToken` in memory and send it as `X-CSRF-Token`. No cookies, passwords or CSRF tokens belong in query strings, localStorage or shared logs. Registration adopts a valid guest only with that guest's CSRF. Account room changes use the account session's CSRF. Game POSTs require the current identity's CSRF plus `roomCode` (mandatory for accounts, optional for legacy guests). The adapter sends these automatically.

Before switching identity or rooms, stop hardware and call `stop(now)`. For location start, explicitly get the real browser watch and mirror its lifecycle with `start(now)` / `receive(fix)`; for stop clear the watch and call `stop(now)`. This is not a `/api/location/start` endpoint. After a successful place, observe the new `treasureId` and require departure / return. After departure, `snapshot(now).canNavigate` permits camera direction guidance. Feed fresh aim samples with `aim(sample)` while in range. Before `collect()` the caller must verify live frames, current local aim and `snapshot(now).canClaim`; the adapter sends `cameraLive: true`, but cannot inspect video for the caller. Await successful collection before displaying completion. Poll using `refresh()` while connected / visible; the existing controller uses 2 s polling and 500 ms rendering. No WebSocket or server push exists.

## Adapter return values and cached state

| Public member | Contract |
| --- | --- |
| `resume()` | Promise with no result payload; populates identity / room or `lastError`; does not start hardware |
| `authenticate('register' \| 'login', username, password)` | `Promise<boolean>`; success restores account and most recent room when present |
| `logout()` | `Promise<boolean>`; success clears local account and game state |
| `connect(name, code = '')` | `Promise<boolean>`; empty code creates, nonempty code joins; accounts use their server-owned username |
| `start(now)` / `stop(now)` | Synchronous local lifecycle mirrors; `stop` queues a server stop, not an awaited completion |
| `receive(fix)` | `Promise<boolean>`; false can mean a skipped in-flight reading, rejected duplicate timestamp or failure; inspect `lastError` |
| `aim(sample)` | `Promise<boolean>`; sends one new aim reading or null to clear; skipped concurrent readings return false; no sensor access inside the adapter |
| `place(radius)` / `collect()` | `Promise<boolean>`; success applies the returned server envelope; false is not completion |
| `refresh()` | Promise with no payload; updates game state when connected and not busy / already polling |
| `snapshot(now)` | Cached render state with local active / online / freshness / busy guards; prefer to raw `data.state` for enabled controls |
| `report(now)` | Coordinate-free export data, extended with cached room / player / receipt / connection information and client events |
| `account`, `accountRooms` | Current account or null; account room list from the latest auth response, refreshed on connection; not a live room-discovery service |
| `connected`, `online`, `active`, `busy`, `lastError` | Respectively current room identity, recent game API success, local location-sharing state, action pending and English error string |
| `data`, `fix`, `phase`, `zone`, `collectionCount` | Cached game envelope, latest accepted device fix, phase, radius-only placed marker or null, current-round count |

The adapter has no subscription / automatic rendering API. Await action promises and render; retain periodic expiry rendering and refresh logic in the controller. It serializes requests, has an 8 s request timeout, drops late-response application after local stop / identity epochs, and prevents overlapping location / poll sends. `fix` can contain precise device coordinates in memory: never serialize the adapter wholesale. Network failure blocks collection; it does not prove the server mutation failed. In particular, do not automatically retry create, register or re-place: they are not idempotent. A collection retry for the same identity / treasure returns the original receipt. Stopping is best effort when offline; local hardware must still be released immediately.

## Complete game envelope

Illustrative unplaced guest response below: IDs, room code, CSRF placeholder and timestamps are documentation-only values, not real sessions, credentials or field evidence. All times / durations use milliseconds; distances and reported accuracy use metres. `state.distance` may be fractional; report distance is rounded. A null value means unavailable, not zero.

```json
{
  "serverTime": 1800000000000,
  "csrfToken": "<csrf-token-from-response>",
  "room": {
    "code": "ABCDEFGH",
    "treasureId": null,
    "placed": false,
    "radius": 3,
    "policy": "one-claim-per-player",
    "playerCount": 1
  },
  "player": { "id": "example-player", "name": "Explorer", "role": "owner" },
  "state": {
    "kind": "stopped",
    "distance": null,
    "phase": "unplaced",
    "eligible": false,
    "canNavigate": false,
    "guidance": null,
    "aim": { "ready": false, "heldMs": 0, "requiredMs": 1200, "expiresInMs": 0 },
    "canClaim": false,
    "canPlace": false,
    "expiresInMs": 0
  },
  "report": {
    "config": { "radius": 3, "exitMargin": 10, "maxAccuracy": 20, "maxAge": 15000, "dwell": 2000 },
    "phase": "unplaced",
    "treasurePlaced": false,
    "placementAccuracyMeters": null,
    "collectionCount": 0,
    "location": {
      "running": false,
      "samples": 0,
      "classification": "stopped",
      "distanceMeters": null,
      "accuracyMeters": null,
      "sampleAgeMs": null
    },
    "events": []
  },
  "receipt": null,
  "players": [ { "id": "example-player", "name": "Explorer", "collected": false } ]
}
```

`treasureId` is null before placement and an opaque string afterward; use the exact returned value without generating one. `room.code` is eight uppercase characters; the current generator uses `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. Normalize user-entered codes by trimming / uppercasing, not by silently accepting arbitrary codes. Guest nickname is 1–32 trimmed characters without control characters. Location latitude is finite in −90…90, longitude in −180…180, accuracy finite and nonnegative, and timestamp a finite Unix time. The server rejects fixes older than 15 s or over 5 s into the future; duplicate / out-of-order timestamps can return HTTP 200 with `accepted: false`. HTTP 200 `accepted: true` still does not imply eligibility: inspect state. Accuracy over 20 m may be recorded but cannot unlock / place.

`state.kind` is one of `stopped | waiting | stale | imprecise | unplaced | inside | outside | boundary`; `state.phase` is `unplaced | leave | return | ready | collected`. `eligible` is location eligibility, not proof of live camera. `expiresInMs` is the server's remaining fix lifetime at response generation, not a command to extend it; the adapter expires cached controls locally. `canPlace` already includes owner permission. A stopped or recovered session can have `phase: collected` with `eligible: false` and a non-null receipt.

`receipt` is null or `{ id: string, collectedAt: number }`. `/api/collect` adds `collection: { id: string, collectedAt: number, repeated: boolean }`; `/api/location` and `/api/aim` add `accepted: boolean`. Other game mutation successes have the same envelope without these extras. `players` lists unexpired memberships, not verified online presence. `player.role: 'guest'` means non-owner in this room, including signed-in users. `report.collectionCount` is 0 or 1 for this player / round, not lifetime totals. `/api/auth/session` room entries `{ code, role }` contain no player inventory or coordinates. Events are `{ at: ISO8601-string, event: string }`, for diagnostics rather than UI flow authority. No successful game response contains raw latitude / longitude.

## Error recovery for the view

Errors have `{ "error": { "code": "…", "message": "English explanation" } }`. Show messages with text rendering, never HTML injection. The following mapping describes recovery, not an automatic retry policy:

| HTTP / code | Frontend action |
| --- | --- |
| 400 `INVALID_USERNAME`, `INVALID_PASSWORD`, `INVALID_NAME`, `INVALID_JSON`, `INVALID_FIX`, `CAMERA_REQUIRED` | Correct input or obtain the necessary real reading / live video; no optimistic success |
| 401 `SESSION_REQUIRED` | No valid guest room; show guest create / join or account entry |
| 401 `ACCOUNT_SESSION_EXPIRED` | Stop hardware, clear obsolete cached identity and request sign-in |
| 401 `INVALID_CREDENTIALS` | Show the generic login failure; do not infer whether a username exists |
| 403 `CSRF_REQUIRED` | Refresh the relevant account / game envelope and its token before another user action |
| 403 `OWNER_REQUIRED` | Keep placement unavailable for a participant |
| 403 `ORIGIN_REJECTED` / 415 `JSON_REQUIRED` | Fix same-origin / configured-origin or JSON integration; do not disable security |
| 404 `ROOM_NOT_FOUND` | Keep join entry and ask the user to check the code |
| 409 `USERNAME_TAKEN`, `ALREADY_SIGNED_IN`, `ROOM_FULL` | Show specific account / room guidance; no automatic retry loop |
| 409 `ROOM_REQUIRED` | Account is signed in without an active room; open room selection |
| 409 `ROOM_CHANGED`, `TREASURE_CHANGED` | Refresh state, discard stale assumptions, stop hardware on room changes and observe the current round |
| 409 `LOCATION_REQUIRED`, `NOT_ELIGIBLE` | Preserve location / leave-return gates and explain the next step |
| 409 `AIM_REQUIRED` | Keep Claim disabled; obtain fresh orientation and video, centre the chest and complete another hold |
| 413 `BODY_TOO_LARGE` | Correct request serialization; do not send images / streams or whole adapter state |
| 429 `RATE_LIMIT`, `AUTH_BUSY` | Pause attempts and offer manual retry later; no `Retry-After` value is currently provided |
| 429 `ACCOUNT_LIMIT`, `ROOM_LIMIT` | Test-server capacity reached; coordinate with the backend owner |
| 404 `NOT_FOUND`, 405 `METHOD_NOT_ALLOWED` | Check the documented route / method |
| 500 `SERVER_ERROR`, timeout / network failure | Keep collection disabled, show service recovery and retry deliberately |

This contract was checked against `server/app.mjs`, `server/store.mjs`, `server/index.mjs`, `public/treasure-lab/client.js` and `model.js` on 2026-11-03. Read the [frontend handoff](frontend-handoff.en.md) for allowed edit areas and hardware acceptance boundaries. That baseline is committed on local `main` (057b9d9); a remote clone will not contain it until it is pushed.

## AR guidance and aim contract (2026-11-04)

There are 15 API routes and eleven static files. This revision adds `ar.js` and `/api/aim`, retaining the existing database schema. Same-origin Permissions-Policy now permits accelerometer, gyroscope and magnetometer; it does not grant device permission. Manual placement remains a test tool. The intended product uses system-generated or staff-placed treasures; those placement interfaces are not implemented.

`state.eligible` means fresh in-range location after confirmed departure / return, independently of aim. `canNavigate` permits camera guidance after confirmed departure while position is valid, including outside and boundary classifications. Stale / inaccurate / stopped position or disconnection blocks navigation. The adapter additionally requires local active tracking. `guidance` is null or `{ bearingDegrees, distanceMeters, mode: 'approach' | 'nearby' }`: degrees clockwise from north, distance in metres. It exposes a derived bearing, not stored coordinates. Near entry locks the last reliable approach bearing to reduce short-range GPS swings; it unlocks on a confirmed outside reading. This presents a virtual target near the horizon, without pinning it to a surveyed physical point. Placement and each player's session reset the relevant gates.

Call `POST /api/aim` with the normal CSRF / room / round guards and this sample shape (illustrative values):

```json
{
  "roomCode": "ABCDEFGH",
  "treasureId": "<current-round-id>",
  "sample": {
    "heading": 180, "pitch": 0, "timestamp": 1800000000000,
    "source": "webkit-compass", "accuracy": 5,
    "cameraLive": true, "videoAgeMs": 0
  }
}
```

`heading` is the rear-camera viewing azimuth in [0,360); `pitch` is elevation in [-90,90]. Both are finite degrees. `source` must be `webkit-compass` or `absolute-orientation`; relative alpha and movement course are insufficient. `accuracy` is null / absent when unavailable, otherwise finite 0–25 degrees. Timestamp is Unix milliseconds, no more than 1500 ms old or 5000 ms ahead of server time. `videoAgeMs` must be 0–750 and `cameraLive` true. Invalid / off-target / null samples clear the hold; they normally return HTTP 200 with `accepted: false`. Repeated / older timestamps cannot advance a hold.

The server measures receipt-time dwell of at least 1200 ms across at least three distinct timestamps with gaps at most 900 ms. Rear-camera angular error (heading and pitch together) must remain within 10 degrees. Client-supplied dwell durations are ignored. `state.aim` is `{ ready, heldMs, requiredMs, expiresInMs }`; `canClaim` additionally requires location eligibility. The adapter expires cached readiness using both position and aim lifetimes. The current controller sends at most one sample every 250 ms, never overlaps aim sends, and maintains an independent local hold / fresh-frame check for the Claim tap. Rendering alone cannot complete a hold. These are initial experiment settings, not accepted physical performance.

Start orientation from the camera tap, requesting Motion & Orientation in the same user gesture before awaiting camera acquisition. `ar.js` transforms absolute orientation into a rear-camera ray including tilt and screen rotation, smooths wrap-around heading, and uses an approximate 60-degree horizontal virtual field of view. Reject stale / low-accuracy / missing compass readings; show retry guidance and withhold the target / Claim. Far away show the direction arrow; near, reveal the chest only inside the view and require centring / holding before manual Claim. Stop / background releases orientation listeners, clears local / server aim and releases camera / location. Export contains AR configuration and status, without automatic raw heading, bearing or coordinates. Video is never uploaded; aim readings go to the computer and remain transient.

Client-reported location, orientation and video age remain untrusted interaction signals, not anti-cheat or proof of physical aiming. Projection is not calibrated camera tracking, floor detection, road routing, world anchoring or SLAM. The rear-camera transform follows [W3C example A.1](https://www.w3.org/TR/orientation-event/#worked-example); upright Safari compass alignment, drift, magnetic disturbance and real outdoor aiming remain pending user tests. See CQ-20261104-008 / E-20261104-007.

## GPS recovery and guide revision

CQ-20261104-010 supersedes the earlier default range / automatic camera-close behavior. Both departure and collection default to 3 m, using reported centre distance without the exit buffer / uncertainty padding at that setting. Larger radii retain the existing conservative rules. Old unversioned saved points migrate once without deleting coordinates, rounds or claims. A private backup preceded runtime migration. GPS cannot establish 3 m physical accuracy.

Transient GPS loss now invalidates targeting / Claim while retaining an active camera and orientation. The arrow is replaced by a reconnecting spinner, with a ten-second watch-recovery loop. Explicit stop, background and permission revocation still release hardware. The adapter's new `loseLocation(now)` invalidates old responses / clears the server fix without turning local tracking off; a new accepted fix clears this interruption. In-flight camera acquisition is still cancelled if location is invalid before capture becomes active.

New `GET /api/guide` and `POST /api/guide` are separate guide envelopes, not game envelopes. They use the existing authenticated room / CSRF / Origin / JSON / current-round guards. `guideRequest(body?, signal?)` is independent of the location / aim queue; guide failure alone does not mark gameplay offline. Key, role, facts, request fields, timeout / rate / isolation rules and the exact response schema are in [AI guide configuration](ai-guide.en.md). Campus and course content are currently empty, the runtime key is unconfigured, and replies explicitly distinguish presets from DeepSeek. No puzzle gate or voice was added. Product code / tests are implemented; real-model and Safari field acceptance remain pending.
