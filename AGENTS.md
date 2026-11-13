# AGENTS.md — PlainNote / plainshare

给在本仓库工作的人或 Agent 用的项目说明与约定。改代码前先读这一份。

## 项目是什么

匿名、免登录的轻量 Markdown / 纯文本笔记服务。创建一次得到三条链接：

| 链接 | 路径 | 用途 |
|---|---|---|
| 编辑 | `/edit/{secret}` | 私有凭证，可改可删 |
| 网页只读 | `/note/{id}` | 渲染后的阅读页 |
| Raw | `/raw/{id}` | `text/plain`，给 curl / 脚本 / LLM |

npm 包名：`plainshare`；CLI：`plainnote` → `dist/cli.js`。

## 技术栈

- **运行时**：Node.js ≥ 18（发版 CI 用 22）
- **后端**：Fastify + TypeScript（`src/server`）
- **存储**：本地 better-sqlite3，或 Turso/libSQL（`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`）
- **前端**：Vite + 原生 TypeScript（无 React/Vue），`src/web`
- **MCP**：`@modelcontextprotocol/sdk`，无状态 Streamable HTTP，入口 `POST /mcp`，当前工具仅 `create_note`
- **测试**：`npm test`（sanitize / update-check / mcp-create）

## 目录要点

```
src/cli.ts                 # CLI 入口
src/server/                # Fastify 服务
  index.ts                 # master：装配路由（含 MCP）
  mcp/                     # MCP server 工厂
  routes/                  # notes / admin / raw / mcp / static
  services/note.service.ts # 业务与限流
  store/                   # sqlite / turso
src/web/                   # Vite 前端
  components/Footer.ts     # 页脚（含版本号 vX.Y.Z）
  pages/ApiPage.ts         # /docs、/zh/docs（含 MCP 说明）
.github/workflows/release.yml
```

`Vercel` 分支另有 Serverless 入口（`app-core.ts` / `vercel-handler.ts` / `vercel.json`），与 `master` 不完全相同。

## 分支约定

| 分支 | 用途 |
|---|---|
| `master` | 本地 / VPS / npm 发版主线 |
| `Vercel` | Vercel 静态 + Serverless + Turso 部署线 |
| `release/x.y.z` | **每次正式发版** 的发版分支号（由 Release Action 创建并保留） |

不要把 `Vercel` 整支盲目合并进 `master`；跨分支移植功能时按文件手工同步。

## 本地常用命令

```bash
npm install
npm run build
npm start                 # 默认 0.0.0.0:3123
npm run dev:server        # tsx watch
npm run dev:web           # Vite 5173，代理 /api /raw /mcp
npm test
```

环境变量见 README / `.env.example`（若有）：`PORT`、`HOST`、`DB_PATH`、`TURSO_*`、`ADMIN_PASSWORD` 等。

## MCP

- 地址：`{origin}/mcp`
- 无鉴权；仅 `create_note`（`content` 必填，`title` / `format` 可选）
- API 文档页有 Cursor 配置示例与配套提示词
- 实现：无状态 + `enableJsonResponse`，适合长驻 Node；Vercel 分支另配了 `/mcp` rewrite

## 版本与页脚

- 版本唯一来源：根目录 `package.json` 的 `version`
- 前端页脚通过 Vite `define` 注入 `__APP_VERSION__`，显示为 `vX.Y.Z`
- 发版必须先改 `package.json`（由 Release Action 的 `npm version` 完成），再构建，这样页脚与 npm / tag 一致

## 发版流程（GitHub Action）

工作流：`.github/workflows/release.yml`（`workflow_dispatch` 手动触发）。

1. 在 GitHub → Actions → **Release** → Run workflow
2. 选择要发版的分支（通常 `master`）与 bump：`patch` / `minor` / `major`
3. Action 会：
   - `npm ci` → `npm test` → `npm run build`
   - `npm version <bump>` 得到新版本 `x.y.z`
   - 创建并推送发版分支 **`release/x.y.z`**
   - 把同一提交推回当前默认发版分支（如 `master`）
   - 打 annotated tag **`vX.Y.Z`**
   - 用 `gh release create` 生成 GitHub Release（notes 自动生成）
   - 若配置了仓库 Secret **`NPM_TOKEN`**，则 `npm publish --access public`
4. 可选 `dry_run=true`：只跑测试/构建与试算版本，不推分支/tag、不发布

### Agent / 人工发版检查清单

- [ ] 功能已在目标分支（一般是 `master`）合并并本地 `npm test` 通过
- [ ] 确认当前 `package.json` version，选择正确 bump（功能小改 patch；MCP 这类能力用 minor）
- [ ] 跑 Release Action（或等价：建 `release/x.y.z`、改 version、tag、`gh release create`、`npm publish`）
- [ ] 核对：远端存在 `release/x.y.z`、`vX.Y.Z`、GitHub Release；页脚显示新版本
- [ ] 需要上 Vercel 时，把必要改动同步到 `Vercel` 分支（不要依赖 Action 自动同步）

### 仓库 Secret

| Secret | 用途 |
|---|---|
| `NPM_TOKEN` | 发布 `plainshare` 到 npm；缺失则跳过 publish，但仍会建发版分支与 GitHub Release |
| `GITHUB_TOKEN` | Action 内置，用于 push / release |

## 编码约定

- 只改任务需要的文件；不要顺手大重构
- 用户没要求就不要主动 `git commit` / `git push` / 改 git config
- 不要提交 `.env`、口令、Turso token
- Windows 下写脚本文件注意 UTF-8（避免 PowerShell 重定向生成 UTF-16）
- 推送若 HTTPS 失败，可用 SSH：`git push git@github.com:rockyflux/PlainNote.git <ref>`

## 相关文档

- 中文 README：`README.zh-CN.md`
- 英文 README：`README.md`
- Vercel 部署说明在 **`Vercel` 分支** 的 `docs/vercel.zh-CN.md` / `docs/vercel.md`
