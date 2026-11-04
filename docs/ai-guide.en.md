# Camera companion and content configuration

[中文](ai-guide.md) · Updated: 2026-11-04 · CQ-20261104-010

The AR camera includes **Chat with guide**, a message preview, English text conversation, **How far?**, **This building** and **Courses here**. No voice, image analysis or puzzle-unlock gate was added. Camera capture continues while reading / typing; opening the conversation clears aiming and hides Claim. Close it and aim again to collect. Camera close, background, identity / room / round changes cancel pending UI work. Keyboard avoidance uses the visual viewport; real iPhone keyboard behavior is still unverified.

The computer backend calculates distance and chooses a known building. The model cannot modify game rules, target coordinates or receipts. Automatic messages introduce a newly detected configured building / its courses, announce GPS loss / recovery, and report distance about every 30 seconds while the conversation is closed. The controller reads guide context every five seconds; opening the conversation pauses proactive interruptions. Server cooldowns prevent repeated arrival / distance messages on every render.

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
| `faq` | Up to 100 entries `{ questions: [English question variants], answer: English approved answer }`; exact normalized matches use the approved reply before the model |
| `places` | Up to 200 verified campus areas, each with a unique `id`, `name`, `description`, numeric `latitude` / `longitude`, numeric `radius` in metres and a `courses` array |
| `courses` | Up to 30 `{ name, description }` entries per place; use verified course descriptions, not inferred teaching assignments |

Only enter verified public campus-site coordinates, not a player's private live position. A building is selected only with a fresh accurate fix whose reported uncertainty circle fits within exactly one configured place. Ambiguous overlaps, missing facts, expired location or weak GPS withhold building context. GPS identifies a nearby configured area; it does not establish which object the camera faces or the floor / room. The model must acknowledge facts absent from the supplied content. Questions explicitly about an unknown building / courses receive the unknown-location preset even when a model key is configured.

## API and failure behavior

Both routes use the existing authenticated room identity. Guide responses are separate from game envelopes; guide failures do not mark game connectivity offline or block its request queue.

| Route | Contract |
| --- | --- |
| `GET /api/guide` | `{ name, providerConfigured, context, messages }`; no hardware permission or provider call |
| `POST /api/guide` | Normal `X-CSRF-Token`, Origin / JSON, `roomCode` and current `treasureId`; send either `message` (1–500 trimmed characters) or `event` (`distance`, `arrival`, `gps-lost`, `gps-restored`) |
| POST result | Same guide view plus `accepted`, and `status: ready | degraded` on an accepted response; a deduplicated / inapplicable event returns `accepted: false` |
| `context` | `{ gps: available | lost | paused, distanceMeters: number | null, place: null | { id, name, description, courses }, knowledgeReady, roundId }`; no raw coordinates |
| `messages` | At most 24 `{ id, role: user | assistant, text, source: player | preset | deepseek, kind, at }` items, rendered as text; per login / guest session and room / round |

`RemoteTreasureSession.guideRequest(body?, signal?)` returns a guide response or null when obsolete. It waits for already queued GPS invalidation, then sends separately so a slow model never blocks location / aiming. There is a 12-second client timeout and an 8-second provider timeout. Server POST limits are 20 requests per player per minute and two simultaneous provider calls globally; concurrent requests in one conversation return 429 `GUIDE_BUSY`. Arrival / GPS events have 60-second cooldowns; distance events 30 seconds. Histories are memory-only, capped at 256 conversations with lazy 30-minute expiry; they reset on restart / round / content changes, with no durable chat table.

Distance, GPS notices and exact FAQ answers use presets. Other supported questions / arrival introductions use DeepSeek when configured. Requests use `/chat/completions`, JSON `{ reply }`, a 400-token output limit and bounded conversation; raw provider errors are never exposed. Empty, malformed, oversized, incomplete, timed-out or failed responses become an explicit preset error (`status: degraded`, `source: preset`) with retry messaging. Model outputs remain untrusted; JSON format alone is not semantic validation. Replies based on an obsolete round, place or GPS context are rejected. Game receipt checks remain independent.

API errors include 400 `INVALID_GUIDE_MESSAGE` / `INVALID_GUIDE_EVENT`, 409 `GUIDE_CONTEXT_CHANGED`, 429 `GUIDE_BUSY` / `RATE_LIMIT` and 503 `GUIDE_CONFIG_INVALID`, plus existing identity / CSRF / room / round errors. No endpoint accepts a client-supplied role, building facts, coordinates or provider key as model context. The shared content file, `.env` and private storage are outside the static allowlist.

## Three-metre mode and GPS recovery

The default is now **3 m for both departure and collection**. This mode uses reported centre distance: outside above 3 m, inside at most 3 m, without the 10 m exit buffer or uncertainty padding. Fixes still require freshness and reported accuracy at most 20 m; stable return / live frames / aim gates remain. This makes short tests possible but does not establish 3 m physical accuracy: GPS drift can trigger or miss the boundary. Other selectable radii 4–100 m retain the uncertainty-based classification. Existing unversioned stored points migrate once to 3 m with a range marker, preserving coordinates, round IDs and claims; the running database was privately backed up before applying it.

An active camera now stays open through transient GPS timeout, unavailable, weak or stale location. The arrow becomes a spinner with **GPS signal lost. Reconnecting…**; the chest / Claim pause. The existing watch continues and is replaced about every ten seconds while recovery is needed. A fresh position resumes guidance without another camera permission request; fresh aiming is still required. Permission revocation, explicit stop, background, identity changes and new rounds still release hardware. This is not background location tracking.

Validation: 80 automated cases, clean install / build, isolated real HTTP, trusted LAN TLS and preserved runtime data passed. Provider fixtures and isolated layout previews are not a live DeepSeek call or Safari acceptance. Outdoor GPS, heading stability, real Safari keyboard / recovery and real-model answers await testing. See [E-20261104-008](../progress/en/evidence/README.md).

Primary references checked on 2026-11-04: [DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/) and [JSON output](https://api-docs.deepseek.com/guides/json_mode/).

## Imported preset v0.1

CQ-20261104-011 imports `Campus_Quest_AI_导览预设_v0.1_2026-11-04.md`. The English section-5 role is used with the existing `{ reply }` API contract. `knowledge` entries have `id`, `aliases`, `text`, `sourceIds`, `relatedIds`; `sources` maps approved IDs to attributed URLs. Retrieval selects explicitly named buildings / subjects and related programmes; limited topic memory supports course follow-ups without requiring GPS. General academic explanations are allowed, but named facts never imply current proximity. Pending map uses and unreviewed geofences are excluded. Distances use an application-created approximate label, with no decimal precision near 3 m; mixed distance / course questions can use the model. Key values and unrelated Softr fields are never loaded as content.

Authentication checks against the official endpoint returned 401; a prefix-format check also failed and was not saved. The original supplied key remains private. No live generated answer or provider acceptance is claimed. The user confirmed replacement is required. All 80 tests and build passed; service restart and health checks passed. See E-20261104-009.

CQ-20261104-012 supersedes the earlier 401 blocker: replacement-key authentication, supported-model discovery (`deepseek-flash`) and one real Building C / example-module answer passed. No GPS or camera data was used; phone behavior remains unverified.
