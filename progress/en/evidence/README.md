[中文](../../zh-CN/evidence/README.md)

# Evidence index

Shared machine index: [evidence-index.json](../../evidence/evidence-index.json). Retain each original once and use the same IDs in both languages.

| ID | Source / retention | Supported findings and limits |
| --- | --- | --- |
| E-20261028-001 | User-exported Brave report, retained in the ignored repository-root file `campus-quest-safari-2026-10-28T09-45-14-625Z.json`; hash rechecked | Supports the [sanitized device review](../../../docs/2026-10-28-device-check-review.en.md); the user confirmed Brave, so this is not Safari acceptance |
| E-20261028-002 | Git implementation commits `19c4224`, `e59b370`, `bb1463a` | Establishes code history for the prototype source, diagnostics and browser-detection fix; does not alone establish individual contribution, phone acceptance or course submission |
| E-20261103-001 | Two course Final3 PDFs retained under the course workspace's `docs/`; hashes in the index | Supports the [requirements map](../course-requirements.md), not a course-platform receipt |
| E-20261103-002 | [Documentation consistency checks](../../evidence/2026-11-03/document-checks.json) | Language pairs, record IDs / hashes / commit references, numbers and relative links checked; not code or phone testing |

Historical desktop screenshots were stored in `/tmp` and are no longer available; none is archived here. Do not take new screenshots and present them as October 28 originals. Put future small sanitized attachments in the shared `progress/evidence/YYYY-MM-DD/` directory, with equivalent Chinese and English descriptions.

Raw JSON is not narrative text and is not duplicated for language coverage. Translations of human observations preserve meaning, source and uncertainty. For large videos or private material, record only a controlled location, hash and access note, never secrets or token-bearing URLs.
