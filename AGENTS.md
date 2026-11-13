# AGENTS.md — PlainNote / plainshare

Project notes and conventions for humans and agents working in this repo. Read this before making changes.

## What this project is

Anonymous, login-free lightweight Markdown / plaintext note hosting. Creating a note yields three links:

| Link | Path | Purpose |
|---|---|---|
| Edit | `/edit/{secret}` | Private credential; can update / delete |
| Read-only web | `/note/{id}` | Rendered reading page |
| Raw | `/raw/{id}` | `text/plain` for curl / scripts / LLMs |

npm package name: `plainshare`. CLI bin: `plainnote` → `dist/cli.js`.

## Tech stack

- **Runtime**: Node.js ≥ 18 (release CI uses 22)
- **Backend**: Fastify + TypeScript (`src/server`)
- **Storage**: local better-sqlite3, or Turso/libSQL (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`)
- **Frontend**: Vite + vanilla TypeScript (no React/Vue), `src/web`
- **MCP**: `@modelcontextprotocol/sdk`, stateless Streamable HTTP at `POST /mcp`; current tool: `create_note` only
- **Tests**: `npm test` (sanitize / update-check / mcp-create)

## Layout

```
src/cli.ts                 # CLI entry
src/server/                # Fastify app
  index.ts                 # master: wire routes (including MCP)
  mcp/                     # MCP server factory
  routes/                  # notes / admin / raw / mcp / static
  services/note.service.ts # business logic + rate limits
  store/                   # sqlite / turso
src/web/                   # Vite frontend
  components/Footer.ts     # footer (includes version vX.Y.Z)
  pages/ApiPage.ts         # /docs, /zh/docs (includes MCP docs)
.github/workflows/release.yml
```

The `Vercel` branch also has a Serverless path (`app-core.ts` / `vercel-handler.ts` / `vercel.json`) and is not identical to `master`.

## Branch conventions

| Branch | Purpose |
|---|---|
| `master` | Local / VPS / npm release line |
| `Vercel` | Vercel static + Serverless + Turso deploy line |
| `release/x.y.z` | **Release branch** created for every formal release (by the Release Action) |

Do not blindly merge the whole `Vercel` branch into `master`. Port features across branches file-by-file when needed.

## Common local commands

```bash
npm install
npm run build
npm start                 # default 0.0.0.0:3123
npm run dev:server        # tsx watch
npm run dev:web           # Vite 5173; proxies /api /raw /mcp
npm test
```

Env vars are documented in the READMEs / `.env.example` (if present): `PORT`, `HOST`, `DB_PATH`, `TURSO_*`, `ADMIN_PASSWORD`, etc.

## MCP

- URL: `{origin}/mcp`
- No auth; only `create_note` (`content` required; `title` / `format` optional)
- API docs page includes a Cursor config example and a companion prompt
- Implementation: stateless + `enableJsonResponse` (good for long-lived Node). The `Vercel` branch also rewrites `/mcp`.

## Version and footer

- Single source of truth: root `package.json` `version`
- Footer gets `__APP_VERSION__` via Vite `define` and shows `vX.Y.Z`
- Releases must bump `package.json` first (Release Action uses `npm version`), then build, so footer / npm / tag stay aligned

## Release process (GitHub Action)

Workflow: `.github/workflows/release.yml` (`workflow_dispatch`).

1. GitHub → Actions → **Release** → Run workflow
2. Pick the branch to release from (usually `master`) and bump: `patch` / `minor` / `major`
3. The Action will:
   - `npm ci` → `npm test` → `npm run build`
   - `npm version <bump>` → new version `x.y.z`
   - create and push release branch **`release/x.y.z`**
   - push the same commit back to the workflow branch (e.g. `master`)
   - create annotated tag **`vX.Y.Z`**
   - `gh release create` (auto-generated notes)
   - if repo secret **`NPM_TOKEN`** is set: `npm publish --access public`
4. Optional `dry_run=true`: build/test and compute the next version only; no branch/tag/publish

### Release checklist (agents / humans)

- [ ] Changes are on the target branch (usually `master`) and `npm test` passes locally
- [ ] Confirm current `package.json` version; pick the right bump (small fixes → patch; capabilities like MCP → minor)
- [ ] Run the Release Action (or equivalent: create `release/x.y.z`, bump version, tag, `gh release create`, `npm publish`)
- [ ] Verify remote `release/x.y.z`, tag `vX.Y.Z`, GitHub Release, and footer version
- [ ] For Vercel deploy, port needed changes to the `Vercel` branch (the Action does not sync that branch)

### Repo secrets

| Secret | Purpose |
|---|---|
| `NPM_TOKEN` | Publish `plainshare` to npm; if missing, skip publish but still create the release branch + GitHub Release |
| `GITHUB_TOKEN` | Built-in for Action push / release |

## Coding conventions

- Change only what the task needs; no drive-by refactors
- Do not `git commit` / `git push` / change git config unless the user asks
- Never commit `.env`, passwords, or Turso tokens
- On Windows, write scripts as UTF-8 (avoid PowerShell redirects that emit UTF-16)
- If HTTPS push fails, try SSH: `git push git@github.com:rockyflux/PlainNote.git <ref>`

## Related docs

- Chinese README: `README.zh-CN.md`
- English README: `README.md`
- Vercel deploy docs live on the **`Vercel`** branch: `docs/vercel.zh-CN.md` / `docs/vercel.md`
