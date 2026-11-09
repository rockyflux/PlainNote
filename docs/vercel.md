# Deploy PlainNote on Vercel (full guide)

**English** | [中文](./vercel.zh-CN.md)

This repo is ready for **Fork → pick your GitHub repo in Vercel → Deploy**.

It runs as **static Vite assets + one Serverless Fastify function + Turso**. There is no long-lived `node dist/cli.js` on Vercel, and no local SQLite / `admin.password` file.

---

## Can I fork and deploy without code changes?

**Yes.** You usually **do not need to change code**. The repo already includes:

- `vercel.json` (install / build / output / rewrites)
- `api/index.ts` (serverless entry)
- Turso via `@libsql/client/http` (no native `better-sqlite3` on Vercel)

What you must provide is **configuration**, not source edits:

- Fork the repo to your GitHub → **no code change**
- Create your own Turso DB + token → **no code change**
- Set Vercel environment variables → **no code change**
- Disable Vercel Authentication for public access → **no code change**
- Deploy a branch that contains `vercel.json` + `api/` → **no code change**

If a branch is missing the Vercel files, use a branch that has them, or merge those commits into your default branch.

---

## Recommended: Fork + Vercel GitHub import

### 1. Fork

Fork this repository on GitHub to your account or organization.

### 2. Turso

1. Create a DB on [Turso](https://turso.tech/pricing).
2. Create an auth token.
3. Keep these values:
   - `TURSO_DATABASE_URL` (e.g. `libsql://xxxx.turso.io`)
   - `TURSO_AUTH_TOKEN`

Use **your own** database; do not reuse someone else’s token.

### 3. Import your fork in Vercel

1. Sign in to [Vercel](https://vercel.com) → [New Project](https://vercel.com/new).
2. Connect GitHub and select **your fork** (not someone else’s upstream unless you can deploy it).
3. Project settings (usually covered by `vercel.json`):
   - **Framework Preset:** Other / empty
   - **Install Command:** `npm ci`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist/static`
   - **Node.js:** `22.x` (recommended on Vercel; package allows `18.x || 20.x || 22.x`)
4. Environment variables (Production; Preview recommended):
   - `TURSO_DATABASE_URL` (required) — your Turso URL
   - `TURSO_AUTH_TOKEN` (required) — your token
   - `ADMIN_PASSWORD` (optional) — enables `/api/admin/*` when set
5. Deploy. Vercel assigns a `*.vercel.app` URL (see the dashboard).

Later pushes/PRs to that GitHub repo follow Vercel’s Git integration.

### 4. Public access

Some accounts enable **Vercel Authentication (SSO Protection)** by default.

For a public notepad: **Project → Settings → Deployment Protection → disable Vercel Authentication** on Production.

```bash
curl -sI https://YOUR_DEPLOYMENT_HOST/ | head -n1

curl -sS -X POST https://YOUR_DEPLOYMENT_HOST/api/notes \
  -H "Content-Type: application/json" \
  -d '{"content":"hello","format":"text"}'
```

---

## Architecture

```text
Browser
  ├─ /*, /edit, /note, /admin, /docs  → Vercel static (dist/static)
  ├─ /api/*                           → api/index.ts → Fastify (serverless)
  └─ /raw/*                           → rewrite → same function → Fastify
                                         └─ Turso (libSQL HTTP)
```

Key files:

- `vercel.json` — build, output, functions, rewrites
- `api/index.ts` — entry → `vercel-handler`
- `src/server/vercel-handler.ts` — Fastify boot (Turso only)
- `src/server/app-core.ts` — shared routes for CLI + Vercel

See `.env.example`. Never commit `.env`.

---

## Optional: CLI deploy

```bash
cd PlainNote
npm ci
npx vercel login
npx vercel link --yes --project YOUR_PROJECT --scope YOUR_TEAM_OR_USER
npx vercel deploy --yes --prod --scope YOUR_TEAM_OR_USER
```

---

## Troubleshooting notes

- Prefer Node **22.x** in the Vercel project settings; the package `engines` field allows `18.x || 20.x || 22.x`.
- Keep `better-sqlite3` as an optional dependency so Vercel installs do not hard-fail on native builds.

## When do you need code changes?

Standard fork deploy: **none**. Only if you want something different:

- **Default branch lacks Vercel files** — switch/merge a branch that has them
- **Custom build/output** — edit `vercel.json` or override in the dashboard
- **No Turso** — not supported on this Vercel shape; use local/VPS SQLite or another DB yourself
- **Custom domain** — Dashboard → Domains (no code)

---

## Checklist (fork deployers)

1. [ ] Forked to your GitHub
2. [ ] Your own Turso URL + token
3. [ ] Vercel imports **your fork**
4. [ ] Env vars set
5. [ ] Branch includes `vercel.json` + `api/index.ts`
6. [ ] Build green
7. [ ] Vercel Authentication off (if public)
8. [ ] Anonymous homepage + create + `/raw/:id` work
9. [ ] Optional: `ADMIN_PASSWORD` + `/admin`

---

## Links

- [Vercel docs](https://vercel.com/docs)
- [Turso pricing](https://turso.tech/pricing)
- [README](../README.md)
