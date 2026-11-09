# PlainNote

**English** | [中文](https://github.com/rockyflux/PlainNote/blob/master/README.zh-CN.md)

**Repository:** https://github.com/rockyflux/plainnote

Anonymous, login-free Markdown notes that `curl`, scripts, and LLMs can consume directly. Write once, get **a private edit link, a read-only web link, and a Raw plaintext link**.

- Minimal notepad UX plus programmable Raw access; **in-browser Markdown rendering** (allowlist-sanitized) is part of this product.
- Stack: **Node.js ≥ 18 · Fastify · better-sqlite3 / Turso (libSQL) · Vite (vanilla TypeScript, no frontend framework)**
- Default: zero external services (local SQLite). Optionally set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` for [Turso](https://turso.tech/pricing) cloud persistence. UI is **zh / en** with API docs at `/docs` and `/zh/docs`

## Three-link model

| Link | Path | Access | Shape |
|---|---|---|---|
| Edit (private) | `/edit/{secret}` | Holder can update / delete / change share id; sole credential; lost = gone | HTML editor (split + live preview) |
| Read-only web | `/note/{id}` | Anyone, read-only | Markdown-rendered page (DOMPurify allowlist) |
| Raw plaintext | `/raw/{id}` | Anyone, read-only | `text/plain`, no HTML wrapper, body as stored |

Public `id` (share code) defaults to 10 chars; you can rename it (6–48, `[A-Za-z0-9-]`). Changing it invalidates old `/note` and `/raw` URLs immediately. The edit `secret` stays the same.

## Requirements

- Node.js ≥ 18 (dev verified on Node 22)
- Native build toolchain for better-sqlite3 only if no prebuild is available (`python3`, `make`, `g++` on Unix; most installs use prebuilt binaries)

## Quick start

### From source

```bash
npm install
npm run build
npm start
```

Listens on all interfaces by default (`0.0.0.0:3123`). Local: <http://127.0.0.1:3123>; LAN: the `Network` URLs printed at startup (DB `~/.plainnote/plainnote.db`).

### Dev mode (hot reload)

```bash
# Terminal 1 — backend (tsx watch)
npm run dev:server

# Terminal 2 — Vite (5173; proxies /api and /raw → 3123)
npm run dev:web
```

### Tests

```bash
# Markdown XSS sanitization regression (Node + jsdom, 12 assertions)
npm test
```

### CLI flags

```bash
node dist/cli.js [options]
# equivalent
npm start -- [options]
```

| Flag | Alias | Precedence: CLI flags > environment variables > defaults.HTTP API (summary)Full curl examples live in the running app at `/docs` (EN) or `/zh/docs` (ZH).**Admin UI:** open `/admin`. The admin password unlocks the note list; view / update / delete still use the existing `/api/notes/:secret` APIs with each note's secret. On first start the server writes `admin.password` next to the DB and prints the password.**Limits (server):** content ≤ 30 000 code points; title ≤ 200; create rate ≈ 10/min and 100/day per IP; title/content matching the sensitive lexicon returns 422.布局 |
| ---- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |

```
plainnote/
├── test/
│   └── sanitize.mjs            # Markdown XSS sanitization (Node + jsdom)
├── src/
│   ├── cli.ts                  # CLI entry (commander, graceful shutdown)
│   ├── server/                 # Fastify → dist/server
│   │   ├── index.ts
│   │   ├── http/               # Errors, origin, client meta, security headers
│   │   ├── routes/             # JSON API, Raw, static + history fallback
│   │   ├── services/           # Validation, sensitive filter, id/secret, DTOs & URLs
│   │   ├── data/               # sensitive.txt lexicon (copied into dist on build)
│   │   └── store/              # Repository (SQLite / Turso)
│   └── web/                    # Vite frontend → dist/static
│       ├── main.ts             # History router
│       ├── pages/              # Home / Edit / Note / Api (docs)
│       ├── components/         # BrandBar / Footer / ErrorView / TopBar
│       ├── lib/                # api, markdown, i18n, history, modal, DOM helpers
│       └── styles.css
├── dist/                       # Build output (gitignored)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Deploy

### Turso (recommended free cloud DB)

1. Create a DB and token on [Turso](https://turso.tech/pricing). Free plan roughly: 100 DBs / 5GB storage / 500M rows read & 10M written per month / 3GB sync (see official pricing).
2. Copy `.env.example` to `.env` (or set platform env vars):

```bash
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
```

3. Start (schema is created automatically):

```bash
npm ci
npm run build
npm start
```

**Storage selection (simple):**

- Both `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` set → Turso  
- No `TURSO_DATABASE_URL` → local SQLite  
- URL set but token missing → startup fails (no silent fallback)

### Pack and upload

```bash
npm ci
npm run build
npm pack
```

Upload the `.tgz`, extract it into the server directory, then install deps:

```bash
npm install --omit=dev
```

**BT Panel:** Website → Add Node project → pick the extract directory → start option `start` (`node dist/cli.js`) → port `3123`. Point the domain reverse proxy to `http://127.0.0.1:3123`. For Turso, add the two env vars in the panel.

Without a panel: `npm start` (or `node dist/cli.js`), default `0.0.0.0:3123` (LAN reachable).

## Publish notes

npm package name is `plainshare`; CLI bin is `plainnote` → `dist/cli.js`. Run `npm run build` before publish.

```bash
npm i -g plainshare
plainnote
# or
npx plainshare
```

## License

MIT (see `package.json`).
