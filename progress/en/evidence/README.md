[中文](../../zh-CN/evidence/README.md)

# Evidence index

Shared machine index: [evidence-index.json](../../evidence/evidence-index.json). Retain each original once and use the same IDs in both languages.

| ID | Source / retention | Supported findings and limits |
| --- | --- | --- |
| E-20261028-001 | User-exported Brave report, retained in the ignored repository-root file `campus-quest-safari-2026-10-28T09-45-14-625Z.json`; hash rechecked | Supports the [sanitized device review](../../../docs/2026-10-28-device-check-review.en.md); the user confirmed Brave, so this is not Safari acceptance |
| E-20261028-002 | Git implementation commits `19c4224`, `e59b370`, `bb1463a` | Establishes code history for the prototype source, diagnostics and browser-detection fix; does not alone establish individual contribution, phone acceptance or course submission |
| E-20261103-001 | Two course Final3 PDFs retained under the course workspace's `docs/`; hashes in the index | Supports the [requirements map](../course-requirements.md), not a course-platform receipt |
| E-20261103-002 | [Documentation consistency checks](../../evidence/2026-11-03/document-checks.json) | Language pairs, record IDs / hashes / commit references, numbers and relative links checked; not code or phone testing |
| E-20261103-003 | [Treasure experiment check summary](../../evidence/2026-11-03/treasure-lab-checks.json) and [initial English page screenshot](../../evidence/2026-11-03/treasure-lab-desktop-en.png) | 28 logic tests, installation / build, HTTP serving and English desktop layout passed. Screenshot has no live camera or location and does not establish Safari field acceptance |
| E-20261103-004 | [Shared backend check summary](../../evidence/2026-11-03/backend-checks.json) and [English backend connection screenshot](../../evidence/2026-11-03/backend-desktop-en.png) | 38 tests, real HTTP dual sessions, browser identity / restart recovery, local install and build passed. Location was not requested, camera remained off, HTTPS relay startup was rejected by automatic review, and no phone URL or field acceptance exists |
| E-20261103-005 | [LAN HTTPS check summary](../../evidence/2026-11-03/lan-checks.json) | 39 tests, computer TLS / IP, two HTTPS sessions, Secure cookies and private-path checks passed. Device trust was not changed; phone reachability and field location remain untested, with no camera capture |
| E-20261103-006 | [User-supplied camera-locked screenshot](../../evidence/2026-11-03/camera-locked-user.png), unedited original with hash in the index | Shows Locked, a disabled button, departure / return instructions and Not Secure. Full URL, certificate trust and camera permission are not visible; no live camera frame is shown |
| E-20261103-007 | [Account check summary](../../evidence/2026-11-03/account-checks.json) and [English account desktop screenshot](../../evidence/2026-11-03/account-desktop-en.png) | 48 tests, migration / restart, cross-device identity / receipts, isolated browser registration / login / logout / reload and 320 / 390 px checks passed. Running LAN TLS entry updated after a private backup; legacy row counts retained. No real-user credentials, phone sign-in, location or camera acceptance |
| E-20261103-008 | [Frontend handoff check summary](../../evidence/2026-11-03/frontend-handoff-checks.json) | Documentation-only source / route review, 12 documented API routes, two response examples checked in memory, 48-element DOM contract and paired document / local link checks. No product test / build rerun, UI redesign, Claude execution or physical-device acceptance |

Historical desktop screenshots were stored in `/tmp` and are no longer available; none is archived here. Do not take new screenshots and present them as October 28 originals. Put future small sanitized attachments in the shared `progress/evidence/YYYY-MM-DD/` directory, with equivalent Chinese and English descriptions.

Raw JSON is not narrative text and is not duplicated for language coverage. Translations of human observations preserve meaning, source and uncertainty. For large videos or private material, record only a controlled location, hash and access note, never secrets or token-bearing URLs.
