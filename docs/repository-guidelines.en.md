# Repository guidelines

[中文](repository-guidelines.zh-CN.md) · Effective: 2026-11-03 · Time zone: Asia/Shanghai

## Documents and languages

1. Save separate Chinese and English versions of new or updated guidelines, progress records, templates, weekly summaries and evidence notes. Update both in the same commit. Match record IDs, dates, numbers, commit references, status and evidence limits; correct facts in both versions.
2. Mirror relative paths under `progress/zh-CN/` and `progress/en/`. Keep each record's body in its own language and retain the counterpart link.
3. Root `README.md` / `README.zh-CN.md` and `AGENTS.md` / `AGENTS.zh-CN.md` are the English / Chinese pairs. Existing Chinese `docs/*.md` files use `.en.md` for their English counterparts. These guidelines use `.zh-CN.md` / `.en.md`.
4. Preserve original handoff material, external documents, code, commands, JSON and screenshots. Provide bilingual descriptions rather than duplicate or alter originals. Leave historical sources in `docs/archive/` unchanged. This policy does not expand the product UI languages or browser scope now.

## Daily updates

- Add a record after substantive implementation, testing, user-feedback analysis or a project decision. Routine reading or repeated checks with no new finding need no separate record.
- Read these guidelines, current project status and recent daily records before work. Before finishing, update both daily versions, their indexes and project status where it changed. Prefer keeping implementation and documentation in one commit. A follow-up documentation commit may add the resulting hash; never invent a hash for the commit being authored.
- Use one `YYYY-MM-DD.md` file per day, with separate IDs such as `CQ-20261103-001` for distinct work items. Never reuse or renumber published IDs.
- Record the goal, outcome, rationale, affected files / implementation commits, validation and results, evidence limits, human and AI roles, blockers and next steps. Use the [paired template](../progress/en/templates/daily.md).
- Separate event dates from recording dates. Label retrospective entries and their sources; do not backdate Git or present reconstructed history as a contemporaneous log. Leave unknown course weeks, hours or member details pending confirmation.

## Weekly records and course submission

- Follow course Form 1, drawing on existing daily records and evidence. Each group has one logical weekly record with two language files. Confirm the course week with the user or course calendar before naming `week-NN.md`.
- Retain the board link, date range, status screenshot, completed work, challenges, requests for support and outcomes, individual reflections, evidence-upload status and formal submission receipts.
- Keep the course's actual board. Creating repository records does not create a second board. Cross-reference board history and screenshots, Git and weekly records. Commit counts alone do not establish individual contribution.
- Each member supplies or confirms their reflection. AI may organize or translate it, but must not invent personal experience or sign for anyone. Keep names, student IDs and signatures required for formal submission in a controlled submission copy, outside Git by default.
- Repository storage is not course-platform submission. Distinguish draft, confirmed, submitted and receipt-verified states. Never claim submission without evidence. Compile weekly summaries when the user requests them; do not create unsolicited scheduled tasks.

## Evidence and privacy

- Use evidence IDs such as `E-20261028-001`. Both language notes cite the same original, recording its source, event time, retained location, SHA256 where an actual file can be checked, supported claims and limits.
- Put small sanitized attachments in `progress/evidence/YYYY-MM-DD/`. Share one machine-readable index; keep explanatory prose in the two language directories. Do not translate JSON field names, IDs or hashes.
- Keep raw phone reports, precise locations, serials, UDIDs, secrets, private communications, signatures and student IDs in ignored local storage or controlled external storage. Store large videos externally with a controlled location, hash and explanation. Never commit token-bearing links.
- Screenshot notes identify browser, device and validation level. Desktop screenshots do not replace iPhone testing. Mark missing files unavailable; do not recreate an image and present it as historical evidence.
- Distinguish automated simulations, desktop checks, physical-phone tests, provider-reported values and user observations. Camera and sensor access does not establish spatial AR; Brave results do not pass Safari acceptance.

## Validation, commits and collaboration

- Preserve dirty work and original baselines. Run applicable `npm test` and `npm run build` checks for code changes. For documentation-only changes, check language pairs, relative links, factual consistency and `git diff --check`.
- Before committing, check that private originals are excluded and both language versions are updated. Never force-add raw logs merely to create a contribution trail.
- Write concise, verifiable records. Disclose AI analysis, code, documentation and translation, alongside user decisions, physical-phone tests and confirmations. An agent-authored Git commit is not automatically evidence of a member's independent work.
- Never invent mentor engagement, board activity, tester counts, tests, hours or school submissions. Keep unsupported fields pending confirmation.

See the [course requirements map](../progress/en/course-requirements.md) for clauses and source pages.
