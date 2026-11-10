# Game guide and tutorials

[中文](ai-guide.md) · Updated 2026-11-11 · CQ-20261111-015

Open **Tutorials** at the top left or use the adjacent chat icon from the start screen, room, camera or game panels. A visitor can ask about the app before joining. The six English tours cover creating a room, joining a room, enabling Indoor, hiding and claiming a treasure, viewing the leaderboard and viewing the Treasure Book. The progress tours guide guests to the account entry and signed-in players to the requested tab. Each tour dims the page and points an arrow at the live control for the current step. The player taps the controls and confirms any round reset.

The tutorial picker slides in and its options appear in order. When a walkthrough starts, the arrow flies from the centre of the visible screen to the first control. The yellow frame and instruction fade in after it arrives. Use the highlighted control to advance. The old frame and instruction fade out first, then the arrow flies to the next control before the new details appear. Closing the tutorial fades out the overlay.

For a matching question, the guide explains the steps in chat and can suggest a tutorial. The game checks the tutorial ID and the player's role before showing **Open tutorial** and **Not now** under the reply. Opening the tutorial fades out chat and starts the same arrow sequence. **Not now** dismisses the invitation and keeps the conversation open.

In a tutorial opened from chat, **Close** or **Done** fades out the tutorial and slides the chat panel back into view. The current conversation and draft are available when you return. Tap the composer to bring up the keyboard. Reduced motion switches directly in either direction.

The computer calculates distance and matches configured buildings. The camera still shows proactive distance and GPS notices and offers **How far?**, **This building** and **Courses here**. Opening chat in AR clears aiming while the video continues. Guide messages persist across screens in the same conversation. The first room retains onboarding chat, and later room and round changes clear the prior hunt context.

## Enable DeepSeek privately

The replacement key is in private `.env` (mode 600). Authentication and one real guide answer passed with HTTP 200; services were restarted to load it (CQ-20261104-012). The connector has passed isolated fixtures and one real guide answer; broad answer quality, latency and quota remain unverified. When no key is configured the panel clearly labels **Preset guide · AI not connected**. Exact-distance replies and configured presets work without a key. Missing building content is identified rather than invented.

1. Copy root `.env.example` to `.env`, keep it ignored and mode 600, and set `DEEPSEEK_API_KEY` locally. Do not paste the key in chat, product HTML, source control, URLs or screenshots.
2. Set `CQ_AI_BASE_URL` and `CQ_AI_MODEL` to the course service / model if needed. Defaults are `https://api.deepseek.com` and `deepseek-flash`, following current official documentation; course access remains unverified. Only trusted HTTPS endpoints are accepted. The backend loads these guide settings from `.env` without overriding the launcher's network settings.
3. Run `./start.sh restart`. Key / endpoint / model changes require restart. `./start.sh status` checks game services, not provider access or account balance.

Provider requests contain the player's text / bounded conversation, approximate target distance, and the selected curated building / course facts. They do not automatically contain camera frames, raw GPS coordinates, account credentials, names, room IDs or session tokens. User-written text can itself contain private information; the panel explains the external text flow. Camera video stays on the phone. No speech / image / third-party map service is used.

## Add the role, presets and campus content

Edit [server/guide-config.json](../server/guide-config.json), or set `CQ_GUIDE_CONFIG=.local/guide-content.json` in `.env` for a private override. The current content imports the user’s v0.1 document: Campus Quest Guide role, 13 knowledge records (campus, four buildings and eight programmes), 17 attributed source records and three FAQ replies. **`places` remains empty** because no reviewed GPS geometry was supplied. The user’s source verification is retained as supplied, not independently rechecked during integration. Content is validated and reloaded on guide requests; changing valid content resets guide conversation context. A malformed file produces `GUIDE_CONFIG_INVALID`, not invented content. Private overrides stay ignored.

| Field | Content / limits |
| --- | --- |
| `name` | Guide display name, 1–60 characters |
| `role` | English character / tone / behavior instructions, 1–12000 characters; fixed system constraints still forbid fabricated places, courses, camera observations and game mutations |
| `presets` | Required English templates: `welcome`, `distance`, `gpsLost`, `gpsRestored`, `unknownPlace`, `arrival`, `providerUnavailable`; each 1–1000 characters |
| Template tokens | `{distance}`, `{distanceLabel}`, `{place}`, `{description}`, `{courses}`; substituted from backend context |
| `faq` | Up to 100 entries `{ questions: [English question variants], answer: English approved answer }`; exact normalized matches supply an approved answer to the model; without a key they use the preset |
| `places` | Up to 200 verified campus areas, each with a unique `id`, `name`, `description`, numeric `latitude` / `longitude`, numeric `radius` in metres and a `courses` array |
| `courses` | Up to 30 `{ name, description }` entries per place; use verified course descriptions, not inferred teaching assignments |

Only enter verified public campus-site coordinates, not a player's private live position. A building is selected only with a fresh accurate fix whose reported uncertainty circle fits within exactly one configured place. Ambiguous overlaps, missing facts, expired location or weak GPS withhold building context. GPS identifies a nearby configured area; it does not establish which object the camera faces or the floor / room. The model must acknowledge facts absent from the supplied content. With a key, questions about unknown buildings / courses still reach the model, which receives a null place and must ask for the building name instead of inferring proximity.

## API and failure behavior

Guide responses are separate from game envelopes. A signed-in account or guest room session can use its existing CSRF token. Outside a room, the first anonymous GET issues an HttpOnly `cq_guide` cookie and a matching CSRF token for guide requests.

| Route | Contract |
| --- | --- |
| `GET /api/guide` | Returns `name`, `providerConfigured`, `context`, `messages`, `csrfToken`, `status` and `providerError`. Reading the guide makes no model call. |
| `POST /api/guide` | Send Origin, JSON, `X-CSRF-Token`, either `message` (1–500 trimmed characters) or `event` (`distance`, `arrival`, `gps-lost`, `gps-restored`), and optionally a supported `page` such as `entry`, `menu` or `camera`. A room request includes `roomCode` and current `treasureId`. |
| POST result | The guide view plus `accepted` and, on an accepted reply, `tutorialId` or `null`. Inapplicable or repeated events return `accepted: false`. |
| Context | Includes `roomRole` (`host`, `guest` or `null`), position mode, GPS status, approximate distance, matched place and current round. Outside a room, the position, distance, place and round fields are empty. |
| Messages | Up to 24 items per conversation with `id`, `role`, `text`, `source`, `kind`, `at` and optional `failureCode`. The client displays text as text. |

`RemoteTreasureSession.guideRequest(body?, signal?)` sends independently of location and aiming. The provider, client and LAN proxy timeouts are 20, 25 and 30 seconds. The API allows 20 POSTs per guide identity per minute and limits unauthenticated visitors outside a room to eight per IP per minute. Two provider calls can run at once, with one per conversation. Arrival and GPS events have a 60-second cooldown. Distance has a 30-second cooldown. Up to 256 conversations stay in memory with a 30-minute idle expiry.

With a configured key, manual questions and camera shortcuts go to DeepSeek. The request supplies the current page, permitted tutorials, approximate game context and curated facts. The connector reads JSON `{ reply, tutorialId? }` with a 400-token output limit. A valid tutorial ID from the current manual reply lets the client offer a walkthrough. The player confirms in chat. GET polls cannot create offers. Welcome, distance and GPS notices use templates. Indoor distance uses the motion estimate. A provider failure returns a labelled preset response with `status: degraded` and a safe error code.

The API rejects an unsupported page with `INVALID_GUIDE_PAGE`, missing visitor setup with `GUIDE_SESSION_REQUIRED`, concurrent work with `GUIDE_BUSY`, and outdated context with `GUIDE_CONTEXT_CHANGED`. Origin, CSRF and current-room checks also apply. The shared content file, `.env` and private storage are outside the static allowlist.

## Three-metre mode and GPS recovery

The default is now **3 m for both departure and collection**. This mode uses reported centre distance: outside above 3 m, inside at most 3 m, without the 10 m exit buffer or uncertainty padding. Fixes still require freshness and reported accuracy at most 20 m; stable return / live frames / aim gates remain. This makes short tests possible but does not establish 3 m physical accuracy: GPS drift can trigger or miss the boundary. Other selectable radii 4–100 m retain the uncertainty-based classification. Existing unversioned stored points migrate once to 3 m with a range marker, preserving coordinates, round IDs and claims; the running database was privately backed up before applying it.

An active camera now stays open through transient GPS timeout, unavailable, weak or stale location. The arrow becomes a spinner with **GPS signal lost. Reconnecting…**; the chest / Claim pause. The existing watch continues and is replaced about every ten seconds while recovery is needed. A fresh position resumes guidance without another camera permission request; fresh aiming is still required. Permission revocation, explicit stop, background, identity changes and new rounds still release hardware. This is not background location tracking.

Validation: 80 automated cases, clean install / build, isolated real HTTP, trusted LAN TLS and preserved runtime data passed. Provider fixtures and isolated layout previews are not a live DeepSeek call or Safari acceptance. Outdoor GPS, heading stability, real Safari keyboard / recovery and real-model answers await testing. See [E-20261104-008](../progress/en/evidence/README.md).

Primary references checked on 2026-11-04: [DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/) and [JSON output](https://api-docs.deepseek.com/guides/json_mode/).

## Imported preset v0.1

CQ-20261104-011 imports `Campus_Quest_AI_导览预设_v0.1_2026-11-04.md`. The English section-5 role is used with the existing `{ reply }` API contract. `knowledge` entries have `id`, `aliases`, `text`, `sourceIds`, `relatedIds`; `sources` maps approved IDs to attributed URLs. Retrieval selects explicitly named buildings / subjects and related programmes; limited topic memory supports course follow-ups without requiring GPS. General academic explanations are allowed, but named facts never imply current proximity. Pending map uses and unreviewed geofences are excluded. Distances use an application-created approximate label, with no decimal precision near 3 m; mixed distance / course questions can use the model. Key values and unrelated Softr fields are never loaded as content.

Authentication checks against the official endpoint returned 401; a prefix-format check also failed and was not saved. The original supplied key remains private. No live generated answer or provider acceptance is claimed. The user confirmed replacement is required. All 80 tests and build passed; service restart and health checks passed. See E-20261104-009.

CQ-20261104-012 supersedes the earlier 401 blocker: replacement-key authentication, supported-model discovery (`deepseek-flash`) and one real Building C / example-module answer passed. No GPS or camera data was used; phone behavior remains unverified.

## Provider failure diagnosis

CQ-20261104-015: errors now distinguish `AI_TIMEOUT`, `AI_NETWORK`, `AI_AUTH`, `AI_RATE_LIMIT`, `AI_UPSTREAM`, `AI_REPLY_TOO_LARGE`, `AI_REPLY_INCOMPLETE` and `AI_REPLY_INVALID`. The header gives a readable reason; a failed assistant message retains `failureCode`, so polling cannot relabel that failure as an enabled / successful model. A later successful answer clears the degraded state. The backend logs only `{ event, code, upstreamStatus, elapsedMs }` to its existing private log; no prompt, reply, raw error, identity, coordinate or credential is logged. This cannot reconstruct earlier failures: the supplied screenshot confirms fallback replies, but their original cause was not recorded. Named Building C retrieval and a live repeat succeeded; that does not establish continuous provider or phone reliability. No automatic paid retry was added.

Indoor RoNIN reports `context.positionMode` as `indoor-ronin`, with `gps: not-used` and `place: null`. The `distanceLabel` identifies RoNIN as the source of the estimate. The indoor flow suppresses GPS and building-arrival messages. [Indoor contract](indoor-demo.en.md)

CQ-20261111-007 formats prior successful assistant replies as JSON and leaves preset notices and failed replies out of the model history. A completed HTTP 200 with whitespace-only content gets one retry with shorter history within the existing 20-second provider deadline. A second blank reply is labelled `AI_REPLY_EMPTY`. Malformed replies receive a separate unreadable-reply notice. [DeepSeek JSON Output](https://api-docs.deepseek.com/guides/json_mode/)
