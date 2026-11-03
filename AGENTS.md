# Campus Quest development

[中文](AGENTS.zh-CN.md)

- Current acceptance target: the user's iPhone Safari. Do not expand to Android, other browsers, WeChat Mini Programs or native apps without a new decision.
- Preserve `docs/archive/` and the original handoff outside this repository. The current platform decision is in [project status](docs/project-status.en.md); the original proposal is historical.
- Never treat mock teammates, permissions granted, an available API, desktop screenshots or unit-test samples as successful iPhone hardware or spatial AR evidence. The confirmed Brave run is supporting evidence, not Safari acceptance.
- Do not commit credentials, device UDIDs / serials, precise user locations or raw private reports. Camera / location data must not upload automatically from the diagnostic page.
- Use `npm ci`, `npm test` and `npm run build` for applicable code changes. The independent diagnostic server needs only Python 3. Documentation-only work needs pairing, link and diff checks, not fabricated test runs.
- Follow [repository guidelines](docs/repository-guidelines.en.md). Read current status and [recent progress](progress/en/README.md) before working. After substantive code, tests, feedback analysis or decisions, update the dated daily entry and index before finishing; update project status only where facts changed.
- Every maintained prose change must have separate Chinese and English files in the same commit. Mirror relative paths under `progress/zh-CN/` and `progress/en/`; preserve record IDs, dates, numbers, statuses and evidence limits. Root `README.md` and `AGENTS.md` have `.zh-CN.md` counterparts; existing Chinese `docs/*.md` use `.en.md` counterparts. Retain immutable originals in `docs/archive/`; shared code and machine / media evidence are not duplicated or translated.
- Retrospective logs state event and recording dates and their sources. Do not backdate Git, infer course weeks or member hours, fabricate screenshots or replace user observations with unsupported acceptance claims.
- Use the paired daily and Form-1 weekly templates. Create numbered weekly records only after course weeks are confirmed. Reuse the actual course board, reference its history / screenshot, and retain formal submission receipts separately; repository storage or Git push is not school submission.
- Disclose human and AI roles. Each member supplies or confirms their own reflection; never invent personal experience, mentor feedback, user counts, contribution evidence or signatures. Keep personal submission details outside Git by default.
- Evidence notes cite stable IDs and the shared [metadata index](progress/evidence/evidence-index.json). Keep raw private reports ignored; commit only sanitized evidence and descriptions. Record missing evidence as unavailable.
