# Campus Quest development

- Current acceptance target: the user's iPhone Safari. Do not expand to Android, other browsers, WeChat Mini Programs or native apps without a new decision.
- Preserve `docs/archive/` as source references and the original handoff outside this repository. The current platform decision is in `docs/project-status.md`; the original proposal is historical.
- Never treat mock teammates, permissions granted, an available API, desktop screenshots, or unit-test samples as successful iPhone hardware or spatial AR evidence.
- Do not commit credentials, device UDIDs/serials, exact user locations, or raw private device reports. Camera/location data must not upload automatically from the diagnostic page.
- Use `npm ci`, `npm test`, and `npm run build` for applicable changes. The independent diagnostic server needs only Python 3.
- Update project status with actual observed results and pending user checks. Do not invent user testing, mentor feedback, promotion metrics, or hardware acceptance.
