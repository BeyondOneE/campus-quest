# Campus Quest

[中文](README.zh-CN.md)

A collaborative campus treasure-hunt project for new students and visitors at XJTLU Taicang. Delivery is mobile web; first-stage acceptance targets the user's **iPhone Safari** only.

## What is available

- `/`: retained six-screen frontend demonstration. Rooms, AR, voice, teammates, leaderboards and AI are still simulated.
- `/device-check/`: standalone Safari diagnostics for the rear camera, orientation, rotation rate, location, manual restart after backgrounding and JSON report export.
- There is no backend, real multiplayer room, account authentication or spatial AR tracking yet.

## Local development

Use a compatible Node.js version of 22.12+ (validated with Node.js 22.23.2):

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

The phone must use a trusted **HTTPS** URL. The computer's `http://localhost` exception does not apply to a phone accessing the computer's LAN IP. A temporary HTTPS entry may forward to this dedicated server; it serves only the four diagnostic assets, with no source listing or data-upload endpoint.

Follow the [Safari checklist](docs/safari-device-check.en.md). The user grants camera, motion and location permissions on the iPhone.

## Validation limits

Separate automated logic tests, desktop-browser checks and physical iPhone tests. The first two do not establish phone hardware acceptance. See [project status](docs/project-status.en.md) for the latest retained evidence.

Exact coordinates are excluded from exported reports by default. Reports and camera frames do not upload automatically. Do not commit reports containing locations. Reloading the page clears the current test state.

## Process records and guidelines

- [English progress](progress/en/README.md) / [中文进度](progress/zh-CN/README.md)
- [Repository guidelines](docs/repository-guidelines.en.md) / [agent rules](AGENTS.md)
- Keep separate Chinese and English versions of maintained prose, updated in the same commit. Weekly summaries follow Form 1. Retain course-platform submission receipts separately.

## Layout

- `src/`, `public/assets/`: imported prototype.
- `public/device-check/`: diagnostics with no third-party runtime dependencies.
- `scripts/`: server exposing only diagnostic assets.
- `tests/`: data validity, permission and lifecycle checks.
- `docs/archive/`: original proposal, handoff notes and source checksums.
- `docs/`: bilingual guidelines, confirmed scope, methods and retained results.
- `progress/`: bilingual daily records, weekly templates, indexes and shared sanitized evidence.

The original Rokid-glasses proposal is historical context; current mobile-web decisions are in project status. Course material containing API keys or personal information stays outside this repository.
