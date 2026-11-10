# Project status

[中文](project-status.md)

Updated 2026-11-11 (Asia/Shanghai). The English treasure experiment runs on the shared computer backend with direct LAN HTTPS. The room menu offers **Outdoor** (GPS) and **Indoor** (RoNIN). New rooms start in Indoor and use four-digit codes. Signed-in players can view their leaderboard rank and Treasure Book. The current build passed automated and desktop checks and is available over LAN HTTPS.

A Hong Kong ECS now runs the backend and CPU RoNIN worker under systemd. The existing AI configuration returned a DeepSeek response. The configured public HTTPS origin supports Indoor. Domain DNS and public HTTPS activation are pending. The new server has a fresh database. [Server deployment](server-deployment.en.md) · CQ-20261111-017

## Confirmed decisions

- Project: `campus-quest`, remote repository `BeyondOneE/campus-quest`.
- Development primarily uses the user's Ubuntu computer.
- Delivery is mobile web. First-stage acceptance targets the user's iPhone Safari only; Android, other iOS browsers, WeChat's browser, Mini Programs and native apps are outside current acceptance scope.
- Validate camera, orientation and location before planning the full application. Preserve the original handoff in the course workspace.
- On 2026-11-04 the user approved direction-arrow → nearby chest → centre / hold → manual Claim. Manual owner placement remains a testing aid; the intended product uses system-generated or staff-placed treasures. Those production placement workflows are not implemented.
- The current phase tests the feasibility of phone-location treasure triggers, camera presentation and collection before using field results to define first-release scope, three core features and final acceptance goals. Only the minimal experiment is authorized; road alignment and ground anchoring are not prerequisites for it.
- The user assigns frontend visual design to Claude and backend, interfaces and functional logic to Codex. Build product UI directly in English from now on; maintained prose remains in separate Chinese and English files. See the [handoff and logic contract](frontend-handoff.en.md).
- The user requires the computer-hosted backend and phone-browser structure from this stage onward to prepare for multiplayer. Phones handle location and camera interaction; the backend owns sessions, shared placement, eligibility and receipts. The page explains sharing after location is started.
- The user proposed direct LAN access. The current setup prepares same-network phone access without Cloudflare, using a separate development certificate. Phone installation and trust must be performed by the user; no trust store was modified automatically and no certificate warning was bypassed.

## Existing work

- Imported the six-screen React prototype from the 2026-10-28 handoff, retaining its source manifest and original proposal.
- The source ZIP matched extracted files and passed bundled SHA256 checks.
- The original `dist` completed the desktop six-screen flow, including wrong answers, completion and reload restoration.
- Added standalone Safari hardware diagnostics and a local static server.
- Added the English `/treasure-lab/` view, remote API adapter and Node / SQLite backend. Guests create or join a session with one shared treasure; the backend checks departure and return and persists one receipt per player. These are experimental rules, not finalized multiplayer gameplay.
- Added a development-certificate generator, HTTPS proxy bound only to the Wi-Fi address, and certificate setup page. The backend remains on loopback; no router or firewall changes were made. See [LAN access](lan-access.en.md).
- Added local account registration / login / logout, cross-device membership and receipt restoration, guest adoption at registration and independent location gates per login session. The running database was privately backed up before migration; original room / player / receipt counts were preserved. See [account API](backend-api.en.md) and CQ-20261103-010.
- Added root `start.sh` and an ownership-checked background service manager with automatic assigned-IP selection, certificate checks, idempotent startup, status / restart / stop and private logs. Actual backend / LAN proxy are detached and healthy; existing data / CA were preserved. See [startup commands](lan-access.en.md#one-command-startup) and CQ-20261104-006.
- Fixed seven incomplete Rollup lock entries containing only `optional: true`; npm restored optional dependency metadata.

## Validation status

| Check | Status | Evidence / limits |
| --- | --- | --- |
| USB basic fields | Physically read | `iPhone18,1` / iOS `27.2` / `24B5089g`, with no serial or UDID |
| Automated logic tests | Passed | 77 cases passed on 2026-11-04: 15 diagnostic cases and 62 treasure / AR / account / client / backend / static-server / certificate / launcher cases; the launcher case contains seven Python ownership / lifecycle checks. Isolated fixtures do not enter the live page or running database and do not establish physical acceptance |
| Clean install and build | Passed | Node.js 24.19.0 / npm 11.17.0; npm ci, TypeScript and Vite independently rerun successfully on 2026-11-04. The prototype JS chunk remains around 520 kB with a size warning |
| New diagnostics on desktop | Passed | Page loading, status and controls; not phone acceptance |
| Supporting iPhone Brave run | User-tested evidence | Camera at 1280 × 720 with 1896 updates; orientation and rotation recently around 60 Hz; reported location radius around 17.49 m; manual restart after backgrounding worked. User confirmed Brave; not Safari acceptance |
| iPhone Safari camera | Pending user test | Current report came from Brave; Safari must be retested |
| iPhone motion recorder | User recordings replayed | Two complete 60 Hz exports provide accelerometer and gyro channels. The offline replay detected an iOS gyro axis mismatch. Euler orientation and in-game motion accuracy still need separate checks. See E-20261110-006 |
| iPhone Safari location | Pending user test | Current report came from Brave; Safari must be retested |
| Concurrent operation, denial recovery, background return | Partial supporting evidence | Brave restart has events and user checks; denial recovery has no explicit physical evidence; all remain pending on Safari |
| Relative clue interaction | Needs improvement | User reported response with poor effect. No spatial anchor exists; not AR acceptance |
| English treasure page on desktop | Passed | English initial state, 320 / 390 pixel widths, page loading and allowlisted HTTP serving checked; no phone-location or camera acceptance |
| Shared backend HTTP and recovery | Passed | Two independent cookie clients joined the same room; browser guest creation and reload recovery checked. Restart persistence of claims is covered by isolated tests, not multiple real phones |
| Local accounts | Automated and desktop checks passed; phone pending | Registration, login / logout, guest migration, cross-device identity / receipts, CSRF and rate limits passed; 320 / 390 px desktop view checked with an isolated temporary database. See E-20261103-007 |
| AR direction and aim-to-claim | Implemented; automated checks passed, Safari field test pending | Absolute rear-camera pose, distant arrow, directional nearby chest, server / local hold, expiry / permission / background guards; no world anchor. See CQ-20261104-008 / E-20261104-007 |
| Location trigger and camera collection in the field | Pending user test | No Safari field evidence exists for this gameplay; radius, accuracy and trigger timing need physical validation |
| Non-scrolling screens desktop check | Passed | Isolated backend and temporary database; no page scroll at 390 × 664, 320 × 500 and desktop width. Location and camera were simulated inputs replaced in the test tab only. 49 tests and build passed. Does not establish Safari acceptance. See E-20261104-001 |
| Codex review of the Claude baseline | Source / automated / entry checks passed; recovery gap recorded | Reviewed 99bb3fb, independently passed 50 tests / build and checked the running 390 × 780 entry. A stale account cookie blocks guest creation without an explicit guest-recovery action; inherited path, no fix in this inspection. See CQ-20261104-005 / E-20261104-005 |
| Current user experience feedback | Provisional test flow; field test deferred | The user understood unlocking and found no obvious logic problem, but deferred testing because the dormitory lacks space. The user stated on 2026-11-04 that this flow is only provisional for testing, not the final design (CQ-20261104-001). This does not establish location or camera acceptance. Screenshot's Not Secure state, camera permission and live video remain unverified. See CQ-20261103-008, CQ-20261103-009 |
| LAN HTTPS entry | Computer checks passed; phone pending | TLS verified with the explicit test CA, Secure cookies and two-session API passed. The phone still needs same-network access and manual trust of the development certificate. Cloudflare remains off |

See the [2026-10-28 device review](2026-10-28-device-check-review.en.md) for sources and limits.

## Next work

The minimal experiment follows the user's authorized “location-based treasure with camera presentation” approach. Road markers, surveyed road coordinates and continuous spatial alignment remain previously discussed candidates, not prerequisites for this experiment. Final product goals have not been promised.

- Run `./start.sh` on the computer for background backend + LAN HTTPS startup; `./start.sh status`, `restart` and `stop` manage them. Manual backend-only startup remains `npm start`, serving the English page and [business API](backend-api.en.md) at `http://127.0.0.1:4180/treasure-lab/`. The creator places the shared test point; other phones join with its session code. After departure, AR directions are available; stable return, centring and holding precede manual Claim. Follow the [field procedure](treasure-lab.en.md) for departure / return, camera and collection.
- Initial location values are a 3 metre collection radius, a 20 metre reported-accuracy threshold, a 10 metre exit buffer, a 15 second fix lifetime and at least 2 seconds of entry observation. The current AR hold uses 18° and 700 ms, with orientation age up to 1500 ms and live-frame age up to 750 ms. The revised aim settings await phone testing.
- This turn tests one shared point only. Full campus zones, maps, scheduled spawns, student verification and complete scoring remain unimplemented. Local password accounts and temporary guest mode are available; password recovery and student SSO are not implemented. The experiment allows an independent claim per player per round, without competitive depletion.
- Shared coordinates and claims persist in ignored SQLite; each player's latest position is evaluated in backend memory without a stored movement history. Video is not uploaded. Client position and camera status are not trusted hardware evidence or anti-cheat protection.
- Current Wi-Fi address: `192.168.50.136`. Certificate setup is at `http://192.168.50.136:4181/`; after trusting the certificate, use `https://192.168.50.136:4443/treasure-lab/`. Backend port 4180 remains loopback-only; `PUBLIC_ORIGIN` matches LAN HTTPS. The address was read in this run and must be rechecked after network changes.
- The user must install and trust the development certificate on a phone in the same reachable network before testing. Computer-side certificate checks do not establish phone operation. The previously rejected Cloudflare relay remains off and is no longer a prerequisite for this experiment.
- Claude can begin frontend work against the existing backend. The updated [handoff](frontend-handoff.en.md), [starting brief](claude-frontend-brief.en.md), [API contract](backend-api.en.md) and [DOM contract](frontend-dom-contract.json) describe the live `/treasure-lab/` route, account / room states, hardware lifecycle and acceptance. The old React demo is separate. The backend baseline is committed on local `main` (057b9d9) and not yet pushed. Claude has completed the non-scrolling screens (CQ-20261104-001) and a visual and motion redesign with later simplification (CQ-20261104-002, CQ-20261104-003, CQ-20261104-004); keyboard, toolbar, animation performance and hardware behaviour on the iPhone await the user. See CQ-20261103-011.
- Use field results to define product scope, actual backend interfaces, three core features, user testing and course delivery. Course requirements remain constraints.

See [CQ-20261103-004](../progress/en/daily/2026-11-03.md#cq-20261103-004--minimal-location-trigger-and-camera-collection-experiment) and [CQ-20261103-005](../progress/en/daily/2026-11-03.md#cq-20261103-005--english-product-ui-and-claude-frontend-responsibilities) for authorization and checks.

See [CQ-20261103-006](../progress/en/daily/2026-11-03.md#cq-20261103-006--shared-computer-backend-and-phone-browser-access) for this backend integration.

See [CQ-20261103-007](../progress/en/daily/2026-11-03.md#cq-20261103-007--direct-lan-https-preparation) for LAN access and certificate boundaries.

Rooms, teammates, AR, voice, AI hints, leaderboards and badges in the original six-screen demo remain simulated or preset. Real guest sessions and durable claims in the independent experiment do not establish completion of those demo features.

## Process records

Established [Chinese](../progress/zh-CN/README.md) and [English](../progress/en/README.md) records, daily / weekly templates, shared evidence metadata and bilingual guidelines under the user-approved plan. October 28 was reconstructed on November 3; course week remains pending and no fictional completed weekly summary was created.

## Current camera / AI revision (2026-11-04)

The user confirmed **both departure and collection at 3 m**, transient GPS loss with retained camera / loading arrow, and **text conversation first**. CQ-20261104-010 implements a camera companion with proactive configured-building / course introductions, distance / GPS notices, manual questions, editable role / preset / campus content and a backend DeepSeek connector. This supersedes the earlier 30 m default and camera-close-on-GPS-loss rule. Three-metre mode uses reported centre distance without the 10 m exit buffer; larger selectable radii retain conservative classification. Physical 3 m accuracy is not established.

Existing saved points were migrated once after a private database backup; aggregate accounts / rooms / players / claims, point coordinates / round IDs and the development CA were preserved. The service was restarted and trusted LAN HTTPS / new modules checked. Current URL remains `https://172.20.10.2:4443/treasure-lab/`. The 77 tests / build and isolated HTTP checks passed. Camera-guide layout was checked only in an isolated labelled desktop fixture at 390 × 780, 320 × 500 and 320 × 250; the real 320 × 500 entry loads without hardware access. These are not phone acceptance.

The **Key is unconfigured**, and `places` / `faq` are empty. Preset replies, exact backend distances and missing-information messages work; real model output and actual campus introductions await private Key / verified content. See [setup / API](ai-guide.en.md) and E-20261104-008. There is no new voice, image analysis or puzzle claim gate. Outdoor GPS recovery, compass stability, Safari keyboard and real DeepSeek behavior remain pending user checks.

CQ-20261104-011: imported the user’s v0.1 role, 13 knowledge / 17 source records and three FAQ replies; no GPS geofences enabled. Named-building / subject questions and course follow-ups work independently of current position through the retrieval path. The Key is configured privately but authentication returned HTTP 401; the user confirmed the official endpoint and will replace the invalid Key. No real generated answer is claimed. 80 tests and build passed; restart / health passed. See [preset integration](ai-guide.en.md) / E-20261104-009.

CQ-20261104-012: replacement Key authenticated at the official DeepSeek endpoint (HTTP 200), and one real guide reply about Building C / a microelectronics module passed in an isolated in-memory session. Services restarted and all health endpoints passed. The prior 401 blocker is resolved; no game-source change or new hardware acceptance. E-20261104-010 records the check without credentials.

CQ-20261104-014: manual messages and quick questions now consistently use DeepSeek when configured, including distance, unknown surroundings and FAQ. Current server context and approved FAQ text ground generation; automatic GPS / distance notices remain presets. No building geofences were added. See [guide routing](ai-guide.en.md) and the daily record for validation / rollout.

CQ-20261104-015: provider / client / guide-proxy deadlines are now 20 / 25 / 30 seconds. Specific provider failure reasons persist across guide polling and produce sanitized private diagnostics. Two Building C live repeats succeeded; the original screenshot failures had no retained error detail and remain unexplained. 83 tests and build passed; see [AI failure diagnosis](ai-guide.en.md#provider-failure-diagnosis) and E-20261104-011. No new physical acceptance.

CQ-20261105-002: the user approved the near-field validation build: 15 m stable GPS entry, a 90 s local rotational search, 1200 ms aim hold, and confirmed coarse departure beyond 35 m. Final collection no longer requires GPS within 3 m or accurate north. The default 3 m slider now controls test departure. Raw gyro / gravity initialisation and browser-relative fallback are implemented; no walking-distance integration, surveyed ground anchor or Safari field acceptance. See [near-field search](near-field-search.en.md).

Current near-field deployment: `https://192.168.50.136:4443/treasure-lab/`; certificate setup: `http://192.168.50.136:4181/`. The root CA is unchanged; these addresses supersede the earlier 172.20.10.2 entry.

CQ-20261105-003 adds the host-phone Indoor motion demo alongside GPS + nearby search, with room-wide menu switching / current-round reset. Indoor step-and-heading estimates drive placement, departure / return and camera aiming without requesting GPS. Distances are explicitly estimated; no shared indoor spatial anchor or phone accuracy acceptance. See [indoor flow / API](indoor-demo.en.md).

CQ-20261110-001 added **Indoor integration demo**. It used horizontal double integration with zero-velocity correction and locked the chest at a fixed local position and height. The host could compare it with the step demo in the room menu. This version was deployed over LAN HTTPS for testing. [Validation](../progress/en/daily/2026-11-10.md)

CQ-20261110-002 uses floor bearings for the integration demo arrow after the user reported that following the previous arrow did not shorten the estimated distance. The AR view displays estimated horizontal distance during nearby search. The updated arrow and remaining positioning drift need a phone retest. See [user feedback and checks](../progress/en/daily/2026-11-10.md).

CQ-20261110-003 adds a top-right camera radar with local heading, chest and estimated offset, available from placement. The integration demo pauses position during detected rapid shaking. Controlled inputs, desktop layout and LAN HTTPS passed. Phone retest is pending. See [radar and shake checks](../progress/en/daily/2026-11-10.md).

CQ-20261110-004 replaces the shake pause with continuous integration using browser event time and a displacement correction after a confirmed stop. The radar has a 5 m radius, a chest dot in range and an outward arrow beyond it. Controlled tests and LAN HTTPS passed. Movement drift and phone accuracy still need evaluation. See the [indoor instructions and research references](indoor-demo.en.md).

CQ-20261110-005 adds a local motion recorder to the test page and room menu. It exports separate shake and measured walk trials with timed reference marks. The offline tools compare the integration demo and RoNIN on each shared recording. See the [recording protocol](motion-recording.en.md).

CQ-20261110-006 records the first two iPhone replays. The prior adapter assumed the wrong iOS gyroscope order. With normalized input, RoNIN had lower moving error on both recordings and higher error at the measured far stop. [Replay results](../progress/en/daily/2026-11-10.md#cq-20261110-006--iphone-motion-replay-results)

CQ-20261110-007 deploys **Indoor RoNIN demo** on the local course server. The new mode uses the corrected axes and acceleration signs for positioning and AR. The measured walk reached nearby search in HTTP replay. Physical iPhone aiming and claiming are pending. [RoNIN instructions and API](indoor-demo.en.md#indoor-ronin-demo)

CQ-20261110-008 fixes the near-field camera target at encounter entry and caps downward tilt at 35°. The radar shows the chest from live floor estimates and uses SVG attributes to show the dot or edge arrow. The user's prior-build claim report and the revised replay and browser checks are recorded separately. [RoNIN aim and radar record](../progress/en/daily/2026-11-10.md#cq-20261110-008--stable-near-field-aim-and-visible-radar-markers)

CQ-20261110-009 constrains velocity to zero during sensor-confirmed RoNIN stops. The walk replay and controlled residual-velocity test passed. The updated estimator is served over LAN HTTPS. Phone retesting of the stop is pending. [RoNIN stop record](../progress/en/daily/2026-11-10.md#cq-20261110-009--ronin-stop-correction)

CQ-20261110-010 retains **GPS + nearby search** and **Indoor RoNIN demo** and retires the step and integration game modes. At startup, a retired-mode room starts a fresh GPS round. The LAN upgrade migrated one room and preserved membership and historical receipts. The integration estimator remains available for offline replay. [Mode removal and verification](../progress/en/daily/2026-11-10.md#cq-20261110-010--gps-and-ronin-only)

CQ-20261110-011 makes pasted room codes easier to enter, asks the host before resetting a placed round and shows aim and claim progress in the camera. All 110 tests, the build and the trusted LAN file check passed. The phone keyboard and revised camera cues await iPhone Safari testing. [Room and camera interaction](../progress/en/daily/2026-11-10.md#cq-20261110-011--room-and-camera-interaction)

CQ-20261110-012 adds **Reset demo** for the host. Confirming closes the current room and returns players to room selection. Accounts and other rooms remain available. The updated LAN service passed the health checks. [Demo reset checks](../progress/en/daily/2026-11-10.md#cq-20261110-012--reset-the-current-demo)

CQ-20261110-013 groups diagnostic tools, departure-distance tuning and demo reset under **Test tools** at the bottom of the room menu. The updated page is available over LAN HTTPS. [Test tools checks](../progress/en/daily/2026-11-10.md#cq-20261110-013--test-tools-in-one-place)

CQ-20261110-014 shortens new room codes to four digits, renames the mode buttons to **Outdoor** and **Indoor**, and widens the aim cone to 18° with a 700 ms hold. Old room codes remain valid. [Room and aim checks](../progress/en/daily/2026-11-10.md#cq-20261110-014--short-room-codes-and-easier-aiming)

CQ-20261110-015 trialled a three-quarter chest SVG. The camera uses the original artwork again following user feedback. [Camera chest record](../progress/en/daily/2026-11-10.md#cq-20261110-015--three-quarter-camera-chest)

CQ-20261110-016 removes the room history. Fresh sign-ins start at room selection. A confirmed **Leave room** or **Sign out** by the host closes the room for everyone. The update is available over LAN HTTPS. [Room exit checks](../progress/en/daily/2026-11-10.md#cq-20261110-016--room-exit-and-disbanding)

CQ-20261110-017 updates the camera overlay on browser drawing frames using the latest pose. The script and styles are available over LAN HTTPS. Actual refresh cadence on iPhone awaits testing. [Camera overlay checks](../progress/en/daily/2026-11-10.md#cq-20261110-017--camera-overlay-refresh)

CQ-20261110-018 separates motion denial from failed permission requests. The LAN service serves the new prompts and the hardware diagnostics page. The phone's actual permission state awaits a diagnostic result. [Motion permission checks](../progress/en/daily/2026-11-10.md#cq-20261110-018--motion-permission-diagnosis)

CQ-20261111-001 adds account find totals, six collectible cards and collection progress on each leaderboard row. The upgrade preserves room records and starts scoring new signed-in claims. [Leaderboard and Treasure Book checks](../progress/en/daily/2026-11-11.md#cq-20261111-001--leaderboard-and-treasure-book)

CQ-20261111-002 gives each card a distinct front-facing chest in AR, the claim view and the Treasure Book. Each placement randomly draws a shared card for the room. The update is available over LAN HTTPS. [Chest variant checks](../progress/en/daily/2026-11-11.md#cq-20261111-002--chest-variants-and-random-placement)

CQ-20261111-004 makes chat available throughout the game and adds the separate **Tutorials** button at the top left. It highlights real controls for three activities and can start from a matching AI reply. The room code and member count appear in Menu. The update is available over LAN HTTPS. [Global guide checks](../progress/en/daily/2026-11-11.md#cq-20261111-004--global-guide-and-tutorials)

CQ-20261111-005 adds separate **Create a room**, **View the leaderboard** and **View the Treasure Book** tutorials. All six tutorials are available in the manual picker and can be selected by the guide for matching questions. The update is available over LAN HTTPS. [Tutorial checks](../progress/en/daily/2026-11-11.md#cq-20261111-005--room-and-collection-tutorials)

CQ-20261111-006 adds chat panel, backdrop and incoming-message motion. The log preserves the reading position and respects reduced motion. The update is available over LAN HTTPS. [Chat motion checks](../progress/en/daily/2026-11-11.md#cq-20261111-006--chat-window-motion)

CQ-20261111-007 recovers blank DeepSeek JSON replies with one bounded retry and labels unreadable replies accurately. A five-turn isolated replay and a real LAN guide request returned model replies after the update. [Guide recovery checks](../progress/en/daily/2026-11-11.md#cq-20261111-007--recovering-blank-guide-replies)

CQ-20261111-008 separates chat opening from keyboard focus. The panel uses a short rebound and the composer gets focus when tapped. The update is available over LAN HTTPS. [Chat focus checks](../progress/en/daily/2026-11-11.md#cq-20261111-008--chat-focus-and-spring-motion)

CQ-20261111-009 shows a question as soon as it is sent and animates the reply on arrival. Trusted LAN HTTPS serves the update. [Message bubble checks](../progress/en/daily/2026-11-11.md#cq-20261111-009--immediate-message-bubbles)

CQ-20261111-010 uses a more pronounced CSS pop for new questions and replies, with a short fade under reduced motion. [Bubble animation checks](../progress/en/daily/2026-11-11.md#cq-20261111-010--css-bubble-entrance)

CQ-20261111-011 keeps the explanation in chat and asks before opening a suggested tutorial. Chat fades out as the tutorial appears. [Tutorial confirmation checks](../progress/en/daily/2026-11-11.md#cq-20261111-011--confirming-tutorials-in-chat)

CQ-20261111-012 returns to the current chat when a walkthrough opened from chat closes. The tutorial fades out and chat slides back with the draft. [Tutorial return checks](../progress/en/daily/2026-11-11.md#cq-20261111-012--returning-from-a-tutorial-to-chat)

CQ-20261111-013 starts new rooms in **Indoor** and reads the saved mode when joining or reopening a room. [Indoor default checks](../progress/en/daily/2026-11-11.md#cq-20261111-013--indoor-as-the-default-mode)

CQ-20261111-014 animates the tutorial picker, each new instruction and arrow, and the closing overlay. [Tutorial motion checks](../progress/en/daily/2026-11-11.md#cq-20261111-014--tutorial-page-motion)

CQ-20261111-015 starts the arrow at the centre and reveals each yellow frame and instruction after the arrow lands. [Tutorial flight checks](../progress/en/daily/2026-11-11.md#cq-20261111-015--sequenced-tutorial-highlights)

CQ-20261111-016 records the user-approved website baseline for the rented-server deployment. [Deployment baseline checks](../progress/en/daily/2026-11-11.md#cq-20261111-016--website-deployment-baseline)
