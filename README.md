# PlainNote

**English** | [中文](https://github.com/rockyflux/PlainNote/blob/master/README.zh-CN.md)

**Repository:** https://github.com/rockyflux/plainnote

Anonymous, login-free Markdown notes that `curl`, scripts, and LLMs can consume directly. Write once, get **a private edit link, a read-only web link, and a Raw plaintext link**.

- Minimal notepad UX plus programmable Raw access; **in-browser Markdown rendering** (allowlist-sanitized) is part of this product.
- Stack: **Node.js ≥ 18 · Fastify · better-sqlite3 / Turso (libSQL) · Vite (vanilla TypeScript, no frontend framework)**
- Default: zero external services (local SQLite). Optionally set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` for [Turso](https://turso.tech/pricing) cloud persistence. UI is **zh / en** with API docs at `/docs` and `/zh/docs`
- **Deploy on [Vercel](https://vercel.com):** fork this repo → import your fork → set Turso env vars. Full guide: [docs/vercel.md](docs/vercel.md)

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

- `-p, --port` / `PORT` — listen port (default `3123`)
- `-H, --host` / `HOST` — bind address (default `0.0.0.0`; use `127.0.0.1` for localhost only)
- `-d, --db` / `DB_PATH` — local SQLite path (default `~/.plainnote/plainnote.db`; also holds `admin.password`)
- `TURSO_DATABASE_URL` — Turso URL; when set, use cloud DB
- `TURSO_AUTH_TOKEN` — Turso token (required with the URL)
- `--sensitive` / `SENSITIVE_PATH` — sensitive-word lexicon path (default: packaged)
- `--admin-password` / `ADMIN_PASSWORD` — set admin password (auto-generated on first start)
- `--show-admin-password` — print existing admin password
- `--no-update-check` / `PLAINNOTE_NO_UPDATE=1` — skip npm update check
- `-h, --help` — help
- `-V, --version` — version

Precedence: CLI flags > environment variables > defaults.

## HTTP API (summary)

Full curl examples: `/docs` (EN) or `/zh/docs` (ZH).

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/notes` | Create note |
| `GET` | `/api/notes/by-secret/:secret` | Full note + three URLs |
| `GET` | `/api/notes/:id` | Public note |
| `PATCH` | `/api/notes/:secret` | Update note |
| `DELETE` | `/api/notes/:secret` | Delete note |
| `GET` | `/raw/:id` | Plaintext body |
| `POST` | `/api/admin/login` | Admin login |
| `GET` | `/api/admin/notes` | Admin note list |

**Admin UI:** `/admin` — password unlocks the list; view/edit/delete still use each note's `secret`. Local first start writes `admin.password` next to the DB; on Vercel use `ADMIN_PASSWORD` only.

**Limits:** content ≤ 30000 chars; title ≤ 200; ≈10 creates/min and 100/day per IP; sensitive words → 422.

## Layout

```
plainnote/
├── api/
│   └── index.ts                # Vercel serverless entry → vercel-handler
├── test/
│   └── sanitize.mjs            # Markdown XSS sanitization (Node + jsdom)
├── src/
│   ├── cli.ts                  # CLI entry (commander, graceful shutdown)
│   ├── server/                 # Fastify → dist/server
│   │   ├── index.ts            # CLI createServer
│   │   ├── app-core.ts         # Shared route wiring
│   │   ├── vercel-handler.ts   # Serverless (Turso only)
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
├── vercel.json                 # Static output + /api /raw routing
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

### Deploy on Vercel (static frontend + serverless API)

You can host PlainNote on Vercel without a long-running Node process. **Turso is required**; no local SQLite / password files.

**→ Full guide: [docs/vercel.md](docs/vercel.md)** (fork, env vars, public access, troubleshooting)

Quick path:

1. **Fork** this repo → [Vercel New Project](https://vercel.com/new) → import **your fork** (usually no code changes).
2. Set `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (optional `ADMIN_PASSWORD`).
3. **Disable Vercel Authentication** under Deployment Protection if the site should be public.
4. Deploy: static from `dist/static`; `/api/*` and `/raw/*` hit serverless Fastify.

Local CLI / VPS long-running deploy is unchanged.

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
