# Project status

[中文](project-status.md)

Updated: 2026-11-03 (Asia/Shanghai). This update adopts bilingual process rules; hardware and code-test results remain from 2026-10-28. No new Safari physical-device test has been recorded.

## Confirmed decisions

- Project: `campus-quest`, remote repository `BeyondOneE/campus-quest`.
- Development primarily uses the user's Ubuntu computer.
- Delivery is mobile web. First-stage acceptance targets the user's iPhone Safari only; Android, other iOS browsers, WeChat's browser, Mini Programs and native apps are outside current acceptance scope.
- Validate camera, orientation and location before planning the full application. Preserve the original handoff in the course workspace.

## Existing work

- Imported the six-screen React prototype from the 2026-10-28 handoff, retaining its source manifest and original proposal.
- The source ZIP matched extracted files and passed bundled SHA256 checks.
- The original `dist` completed the desktop six-screen flow, including wrong answers, completion and reload restoration.
- Added standalone Safari hardware diagnostics and a local static server.
- Fixed seven incomplete Rollup lock entries containing only `optional: true`; npm restored optional dependency metadata.

## Validation status

| Check | Status | Evidence / limits |
| --- | --- | --- |
| USB basic fields | Physically read | `iPhone18,1` / iOS `27.2` / `24B5089g`, with no serial or UDID |
| Diagnostic logic tests | Passed | 15 cases covering browser misclassification, null and zero data, angle wrap, stale samples, permissions, asynchronous cancellation, background stopping and coordinate export |
| Clean install and build | Passed | Node.js 22.23.2 / npm 10.9.8; npm ci, TypeScript and Vite passed. Prototype JS chunk around 520 kB produced a size warning |
| New diagnostics on desktop | Passed | Page loading, status and controls; not phone acceptance |
| Supporting iPhone Brave run | User-tested evidence | Camera at 1280 × 720 with 1896 updates; orientation and rotation recently around 60 Hz; reported location radius around 17.49 m; manual restart after backgrounding worked. User confirmed Brave; not Safari acceptance |
| iPhone Safari camera | Pending user test | Current report came from Brave; Safari must be retested |
| iPhone Safari orientation / motion | Pending user test | Current report came from Brave; Safari must be retested |
| iPhone Safari location | Pending user test | Current report came from Brave; Safari must be retested |
| Concurrent operation, denial recovery, background return | Partial supporting evidence | Brave restart has events and user checks; denial recovery has no explicit physical evidence; all remain pending on Safari |
| Relative clue interaction | Needs improvement | User reported response with poor effect. No spatial anchor exists; not AR acceptance |

See the [2026-10-28 device review](2026-10-28-device-check-review.en.md) for sources and limits.

## Next work

After phone validation, select a real route and scope authentication, multiplayer state, split clues, persistent scores and AR. User-testing, course-report and demonstration-evidence plans follow that decision.

Rooms, teammates, AR, voice, AI hints, leaderboards and badges remain simulated or preset; they do not prove those real features are complete.

## Process records

Established [Chinese](../progress/zh-CN/README.md) and [English](../progress/en/README.md) records, daily / weekly templates, shared evidence metadata and bilingual guidelines under the user-approved plan. October 28 was reconstructed on November 3; course week remains pending and no fictional completed weekly summary was created.
