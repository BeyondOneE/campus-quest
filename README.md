# Campus Quest

[中文](README.zh-CN.md)

A collaborative campus treasure-hunt project for new students and visitors at XJTLU Taicang. Delivery is mobile web; first-stage acceptance targets the user's **iPhone Safari** only.

## What is available

- Vite prototype `/` (`npm run dev`): retained six-screen frontend demonstration. Rooms, AR, voice, teammates, leaderboards and AI are still simulated. The backend root (`npm start`) redirects to `/treasure-lab/`.
- `/device-check/`: standalone Safari diagnostics for the rear camera, orientation, rotation rate, location, manual restart after backgrounding and JSON report export.
- `/treasure-lab/`: computer-hosted treasure experiment with guest sessions, shared placement and persistent per-player collection; see the [test procedure](docs/treasure-lab.en.md). Physical Safari acceptance remains pending.
- The experiment has a real backend. Local username / password accounts are implemented; student verification, final multiplayer gameplay and spatial AR tracking remain unimplemented; the original six-screen demo still uses simulated features.

## Local development

For the shared experiment, use the validated Node.js 24.19.0 runtime and run `npm start`. Open `http://127.0.0.1:4180/treasure-lab/`; the computer serves both the page and the [business API](docs/backend-api.en.md). Phone access uses [direct LAN HTTPS](docs/lan-access.en.md), a matching `PUBLIC_ORIGIN` and manually trusted development certificate. Cloudflare remains off; phone trust and connectivity are still pending.

Frontend handoff: start with the [Claude brief](docs/claude-frontend-brief.en.md), [edit / acceptance guide](docs/frontend-handoff.en.md) and [API contract](docs/backend-api.en.md). The page now uses non-scrolling screens; see the [2026-11-04 record](progress/en/daily/2026-11-04.md).

For the retained Vite prototype, use a compatible Node.js version of 22.12+ (historically validated with Node.js 22.23.2; the current shared backend uses Node.js 24.19.0):

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Do not open `dist/index.html` by double-clicking it. Deployment defaults to a site's root path.

## Physical iPhone check

The standalone page needs no npm dependencies:

```sh
python3 scripts/serve_device_check.py
```

The phone must use a trusted **HTTPS** URL. The computer's `http://localhost` exception does not apply to a phone accessing the computer's LAN IP. This Python server serves only four diagnostic assets, with no source listing or data-upload endpoint. Use `npm start` for the shared treasure backend instead.

Follow the [Safari checklist](docs/safari-device-check.en.md). The user grants camera, motion and location permissions on the iPhone.

## Validation limits

Separate automated logic tests, desktop-browser checks and physical iPhone tests. The first two do not establish phone hardware acceptance. See [project status](docs/project-status.en.md) for the latest retained evidence.

Exact coordinates are excluded from exported reports by default. Reports and camera frames do not upload automatically. In the shared experiment, starting location sends positions to the computer for range checks; shared-point coordinates persist in ignored SQLite, while latest player fixes stay in memory without movement histories. Guest identity and claims survive reloads. Diagnostic-page state still resets on reload. Do not commit private reports or databases.

## Process records and guidelines

- [English progress](progress/en/README.md) / [中文进度](progress/zh-CN/README.md)
- [Repository guidelines](docs/repository-guidelines.en.md) / [agent rules](AGENTS.md)
- Keep separate Chinese and English versions of maintained prose, updated in the same commit. Weekly summaries follow Form 1. Retain course-platform submission receipts separately.

## Layout

- `src/`, `public/assets/`: imported prototype.
- `public/device-check/`: diagnostics with no third-party runtime dependencies.
- `public/treasure-lab/`: English functional view, same-origin API adapter, live location and camera lifecycle.
- `server/`: Node HTTP backend, SQLite accounts / guest sessions / shared points / claim receipts; private data lives under ignored `.local/`.
- `scripts/`: server exposing only diagnostic assets.
- `tests/`: data validity, permission and lifecycle checks.
- `docs/archive/`: original proposal, handoff notes and source checksums.
- `docs/`: bilingual guidelines, confirmed scope, methods and retained results.
- `progress/`: bilingual daily records, weekly templates, indexes and shared sanitized evidence.

The original Rokid-glasses proposal is historical context; current mobile-web decisions are in project status. Course material containing API keys or personal information stays outside this repository.
