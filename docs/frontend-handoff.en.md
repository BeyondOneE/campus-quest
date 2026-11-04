# Claude frontend handoff

[中文](frontend-handoff.md) · Baseline reviewed: 2026-11-03 (Asia/Shanghai)

## Start here

Frontend work can start against the existing backend. Claude owns visual design, layout, English copy and frontend presentation; Codex owns backend, API contracts, persistence and domain rules. Read [AGENTS](../AGENTS.md), [project status](project-status.en.md), this guide and the [API contract](backend-api.en.md) before editing. The [ready-to-use brief](claude-frontend-brief.en.md) is the handoff starting prompt.

Work in `/home/beyondonee/projects/campus-quest`. `/home/beyondonee/Documents/xjtlu/workspace/ent207tc` holds course material and original handoff documents. Preserve those originals and `docs/archive/`.

This handoff prepares Claude's work; it does not claim Claude has received it, implemented a design or passed user acceptance. The current visual design is replaceable. The user stated on 2026-11-04 that place → leave → return → camera claim is only a provisional test flow, not the final design; outdoor tests are deferred because the dormitory lacks space. Claude has changed the page to non-scrolling screens; see CQ-20261104-001, with visuals and motion redone in CQ-20261104-002.

## Course context and reading priority

Also read the local course context under `/home/beyondonee/Documents/xjtlu/workspace/ent207tc/docs/`:

| Priority | File | How to use it |
| --- | --- | --- |
| Required context | `ENT207TC_GroupCW_2627_Final3.pdf` | Assignment goals, grading, deliverables and process evidence; understand what the product and its demo need to support |
| Required context | `ENT207TC_ModuleHandbook_2627_Final3.pdf` | Course framework, staged expectations and AI / contribution disclosure; the platform table on PDF page 6 allows a platform of choice, including other options, rather than mandating Softr |
| Historical background | `project_proposal.md` | Original campus audience and exploration / collaboration idea; its AR-glasses, Rokid, Unity and Agora direction predates the current phone-web decision and does not override it |
| On demand | `ENT207TC_Softr_AI_Helper_Guide_Week7.pdf`, `ENT207TC_Using_Your_Groups_DeepSeek_API_Key.pdf` | Tool-specific references if an authorized later integration needs them; this frontend redesign does not require a Softr rebuild or a new AI feature |

The [course requirements map](../progress/en/course-requirements.md) summarizes the two main PDFs and points to their retained originals. Do not copy / modify originals or include actual API keys in a frontend handoff. Course documents describe assessment context; current [project status](project-status.en.md) and API contracts define the agreed implementation direction. Do not invent missing features or silently revive an old architecture to match an earlier proposal. Course-version and submission questions still need the actual course notices; frontend completion alone is not course acceptance.

## Product and first delivery

Campus Quest is a mobile-web campus treasure hunt. Real phone location determines eligibility; the camera displays a collectible treasure overlay after unlocking. This version has no road alignment, spatial tracking, ground anchor or route guidance.

Target the user's iPhone Safari. Build all product UI directly in English: labels, errors, pending states, instructions and accessibility text. Keep maintained repository prose in separate Chinese / English files.

The first frontend delivery should cover this real flow:

1. Restore sign-in, or register / sign in / continue as a guest.
2. Create a room or join by its eight-character code; show the current user, room code, owner role and player roster.
3. Explicitly start live location, explaining that coordinates go to the computer and video stays on the phone.
4. The owner places the shared treasure using a fresh accurate position. Everyone leaves the range and returns to unlock it.
5. Explicitly open the rear camera after unlocking; show the collectible only after observed live video updates.
6. Collect only after server confirmation, show the receipt / collected state, then release the camera.
7. Keep optional field notes, coordinate-free export and hardware diagnostics reachable but secondary to the game.

Page splits, navigation, typography, colors, spacing, iconography, the treasure illustration and animations are Claude's design space. Do not invent working maps, scheduled spawns, scoring, chat, AI hints or account recovery; their backend interfaces do not exist yet. The treasure itself may be illustrated; the live-camera background and location must remain real.

## Choose the correct entry

| Area | Current purpose / edit boundary |
| --- | --- |
| `public/treasure-lab/index.html`, `style.css` | Live English functional view; primary redesign target |
| `public/treasure-lab/app.js` | DOM rendering plus permission / location / camera / report lifecycle; retain it for a styling pass, or explicitly port its behavior for a component rewrite |
| `public/treasure-lab/client.js` | `RemoteTreasureSession` API adapter; reuse for the real frontend |
| `public/treasure-lab/model.js` | Server-side domain model and isolated test model; read as a contract, preserve gameplay rules |
| `server/` | Actual account / room / eligibility / receipt backend, LAN proxy and storage; coordinate contract changes with Codex |
| `src/`, root `index.html`, `dist/` | Original six-screen React demonstration with simulated features; not the integrated game |
| `public/device-check/` | Independent hardware diagnostics; retain its real-device behavior and link |
| `.local/` | Ignored private database, backups and certificates; do not reset, export or include in a handoff package |

`npm start` serves the live view at `http://127.0.0.1:4180/treasure-lab/`. `npm run dev` starts the old Vite prototype; it does not proxy `/api` and is not the gameplay integration server. Building `src/` alone does not update the live game.

The backend currently serves an explicit allowlist: five treasure files and four diagnostic files. New assets, additional modules, external font / CDN dependencies, a React bundle or a separate frontend origin need an integration change coordinated with Codex. The current CSP permits same-origin assets and connections. Do not weaken CSP, cookie protection or CORS merely to make a preview work. Preserve the live URL and same-origin API path.

For a styling / structure pass, retain every controller-used element ID and required element type; see [DOM contract](frontend-dom-contract.json). Keep elements mounted if `app.js` still queries them, including hidden / secondary panels. Retain `[hidden]` behavior, button disabled states, the video element's `playsinline`, `autoplay`, `muted` attributes, and the account form's validation / password semantics. If replacing the controller, a visually equivalent screen alone is insufficient: port and verify its lifecycle obligations below.

## Server and view state

Use `RemoteTreasureSession`, never a new local `TreasureSession`, as the product authority. The adapter does not own hardware, DOM rendering or a subscription system; the controller owns those. The complete method / response contract and plain-JavaScript example are in [backend API](backend-api.en.md).

| UI situation | Render / action requirements |
| --- | --- |
| Restoring identity / request pending | Show progress, prevent duplicate submission, await completion before moving to the success view |
| Signed out / guest | Offer account entry and temporary guest rooms; a nickname does not verify identity |
| Signed in, no active room | Show account / room choices; do not treat `ROOM_REQUIRED` as incorrect credentials |
| Registration from a valid guest room | Keep that player ID, owner role and receipts; explain this before registration |
| Login / another device | Restore account membership; never merge an unrelated guest automatically or restart hardware |
| Owner / participant | `player.role` is `owner` or `guest`; the latter is a room permission role even for a signed-in account. Only the owner places / re-places |
| Network failure / session expiry | Show recovery or sign-in entry and block collection; never fabricate successful local progress |
| New treasure round / room switch | Discard old eligibility, read current state and restart location manually when required |
| Collected | Render the server receipt. Repeated requests return the same receipt; no new points or prizes are implied |

Roster `players[].collected`, `receipt` and `collectionCount` refer to the current room's current treasure round. They are not a global profile, lifetime inventory, total score or proof of connected / online players. `playerCount` counts unexpired memberships. Room codes are private play-session data, not public discovery listings. There is no leave-room, delete-room, profile-edit or password-reset endpoint.

## Location, camera and lifecycle obligations

Phases are `unplaced → leave → return → ready → collected`. Use the adapter's `snapshot(now)` for enabled states; a cached phase of `ready` alone cannot authorize the camera or collection. Location classifications are `stopped`, `waiting`, `stale`, `imprecise`, `unplaced`, `inside`, `outside`, `boundary`.

| State / event | Behavior to preserve |
| --- | --- |
| No room / insecure origin | No hardware request; explain the required next step |
| `unplaced` | Owner can place only when `snapshot.canPlace` is true |
| `leave` | Explain the required departure; camera stays locked |
| `return` | Show return / stable-position progress; rendering or a timer cannot advance the server's observation |
| `ready` | Offer camera only while `snapshot.eligible` is true; stale, inaccurate, boundary or offline readings block it |
| Camera permission / pending stream | Ask only on an explicit tap; a late stream after cancellation or backgrounding must have every track stopped |
| Video available | A stream or granted permission is not enough: require observed frame updates / advancing video time before making the chest collectible |
| Collection | Require fresh location, eligibility and a live frame, then await `collect()` success; release camera after confirmation |
| Denied permission / blocked playback | Show actionable English retry messages; retain the explicit Resume video action when needed |
| Location expires / loses validity | Close the camera and disable collection |
| Background / pagehide / unmount / identity change | Clear location watch (including ID `0`), cancel frame callbacks and stop media tracks; call `session.stop(now)` |
| Foreground / restore | Show paused state; restart location / camera only after another user action |

Current defaults: radius 30 m (15–100 adjustable), reported accuracy at most 20 m, exit buffer 10 m, fix lifetime 15 s, return observation at least 2 s across distinct timestamps. These are experimental settings awaiting field validation. Preserve them during this visual handoff. Camera display is an overlay, not world-anchored AR, and client location / `cameraLive` are not anti-cheat evidence.

## Running and validation

Use the repository's validated Node 24.19.0 / npm 11.17.0 environment. Inspect running services before starting another copy; no restart is needed for edits to the existing allowlisted static files. Reload the browser after static changes. Source changes to `server/` require a backend restart coordinated with Codex.

```sh
cd /home/beyondonee/projects/campus-quest
npm ci
npm start
```

For the user's phone, follow [LAN HTTPS](lan-access.en.md). The last verified address on 2026-11-03 was `https://192.168.50.136:4443/treasure-lab/`; recheck the Wi-Fi IP and service health before using it. The phone needs the same reachable network and manually trusted development certificate. Do not bypass a certificate warning, change device permissions or enable an external relay on the user's behalf.

After frontend code changes, run `npm test` and `npm run build` as required by [AGENTS](../AGENTS.md). The latest recorded baseline has **48 passing tests** and a successful build; this documentation handoff does not rerun or replace that evidence. The old prototype has an approximately 520 kB chunk warning; the last install reported 10 moderate dependency advisories. Neither is silently resolved by a redesign.

Deliver these checks with the new view:

- Check real rendered English at 320 / 390 px and ordinary desktop widths, including long errors, validation, loading, signed-in / signed-out and disabled states. No horizontal overflow; controls remain reachable around Safari toolbars / safe areas. Test actual views, not only whether the old prototype builds.
- Exercise registration, login, logout, guest adoption, create / join, reload and account room restoration against the real local API. Use an isolated test database for throwaway users. Do not reset the running user's `.local/` database.
- Retain the existing automated geofence, camera, background / late-callback and adapter checks. If lifecycle / component code changes, add only meaningful regressions for changed behavior; do not remove gates to make tests pass.
- Keep screenshots labeled desktop / actual device and record the exact route. Do not insert fake camera frames, coordinates or permission success into the shipped UI. Unit-test fixtures remain isolated tests.
- User phone sign-in and outdoor departure / return / video / collection are still pending. The user will run hardware acceptance later; desktop completion must not be labeled Safari acceptance.

Return a changed-file summary, actual checks / outcomes, screenshots, remaining backend requests and paired dated progress updates. Update `progress/en/` and `progress/zh-CN/` using the next unused record ID. Do not invent course submission or individual contributions.

## Working tree and handoff transport

The backend, treasure UI, tests and docs are committed on local `main` (057b9d9) and not yet pushed; later frontend changes are in subsequent commits. Do not reset, clean, overwrite or switch away from them blindly. A fresh remote clone does not contain this complete baseline until it is pushed. If Claude works in this same directory, use these actual files; if it works elsewhere, transfer the required current source / tests / docs or establish an explicit Git checkpoint first. Exclude `.local/`, credentials, certificate private keys and raw phone reports. No commit or push was made by this documentation task.
