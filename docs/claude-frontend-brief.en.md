# Claude frontend starting brief

[中文](claude-frontend-brief.md) · Prepared: 2026-11-03

Use the following as the task for Claude in the existing repository. It authorizes frontend work under the existing handoff boundaries, not backend changes or deployment.

---

Take over the frontend design and implementation of Campus Quest in `/home/beyondonee/projects/campus-quest`.

Read `AGENTS.md`, `docs/project-status.en.md`, `docs/frontend-handoff.en.md` and `docs/backend-api.en.md` first. Inspect the current working tree and preserve uncommitted / untracked work.

Also read the two main course PDFs and `project_proposal.md` in `/home/beyondonee/Documents/xjtlu/workspace/ent207tc/docs/`, following the reading priorities in the handoff. The PDFs provide assessment context; the proposal is historical. Retain the current phone-web / location-trigger / camera-overlay direction. The two Softr / DeepSeek tool guides are optional for this redesign, and no actual API keys are needed.

Build a polished, coherent mobile experience directly in English for the user's iPhone Safari. You own visual design, page structure, navigation, copy and frontend presentation. Codex owns backend, API contracts, persistence and gameplay rules. You have freedom to replace the current appearance.

The live integrated page is `public/treasure-lab/`, served by `npm start` at `/treasure-lab/`. `src/` is an older simulated six-screen React demo. Do not redesign only the demo and report it as integration. The server serves an explicit static allowlist; coordinate new bundles / assets / origins with Codex rather than weakening security or silently changing the serving architecture.

Implement the existing flow: account registration / login / logout or guest mode → create / join a room → explicit real location → owner places a shared treasure → leave and return → unlock → explicit rear camera → collect after live frames and server confirmation. Use `RemoteTreasureSession` from `public/treasure-lab/client.js`. Preserve guest adoption at registration, cross-device identity / receipts, server authority, owner permissions, freshness / accuracy / boundary gates, background cleanup, late-stream cancellation and manual restart. The user has accepted these interaction rules.

If retaining `app.js`, keep the DOM IDs / element semantics in `docs/frontend-dom-contract.json`. If rewriting the controller as components, explicitly port its hardware lifecycle; the remote adapter does not handle hardware or rendering for you. Use its `snapshot(now)` for enabled states and await async results. Never treat cached `ready` alone, permission granted, a stream without live frames or a failed request as a successful collection.

Make loading, signed-out / signed-in / no-room, denied permission, stale / inaccurate location, locked / ready / collected, network failure and expired-session states usable. Keep field notes / export / hardware diagnostics accessible as secondary tools. Do not add fake camera backgrounds, fake GPS, simulated players, unimplemented working maps, scores, chat or password recovery. The AR portion is a camera overlay; no road alignment or world anchor is required.

Start by inspecting the current files and choosing a visual direction, then implement the frontend end to end within these boundaries. Check the actual live route at 320 / 390 px and desktop widths. Run the applicable repository checks, retain meaningful lifecycle regression coverage, and report changed files, screenshots, actual results, remaining backend requests and evidence limits. Update paired daily progress and indexes. Desktop checks do not pass iPhone hardware acceptance; outdoor tests remain deferred to the user. Do not reset `.local/`, expose secrets, deploy, enable external relays or claim course submission.
