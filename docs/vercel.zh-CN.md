# PlainNote 部署到 Vercel（全流程）

[English](./vercel.md) | **中文**

本仓库已支持 **Fork → 在 Vercel 里选中你的 GitHub 仓库 → 一键部署**。

形态是 **静态前端（Vite）+ Serverless API（Fastify）+ Turso**，不在 Vercel 上跑 `node dist/cli.js` 常驻进程，也不使用本地 SQLite / `admin.password` 文件。

---

## 结论：能不能 Fork 后直接部署？

**可以。** 一般**不用改代码**。仓库里已有：

- `vercel.json`（Install / Build / Output / rewrite）
- `api/index.ts`（Serverless 入口）
- 生产路径只用 Turso HTTP 客户端（不依赖 `better-sqlite3` 原生编译）

你需要自己准备的是**配置**，不是改源码：

- Fork 仓库到自己的 GitHub → **不用改代码**
- 在 Turso 建库并拿 Token → **不用改代码**
- 在 Vercel 填环境变量 → **不用改代码**
- 关闭 Vercel Authentication（公开访问） → **不用改代码**
- 选对要部署的分支（含 `vercel.json` / `api/`） → **不用改代码**

若上游某分支还没合入 Vercel 相关文件，Fork 后请使用**已包含这些文件的分支**，或自行把该分支合并进你要用的默认分支。

---

## 推荐流程：Fork + Vercel 连接 GitHub

### 1. Fork

在 GitHub 上 Fork 本仓库到你的账号（或 Organization）。

### 2. 准备 Turso

1. 打开 [Turso](https://turso.tech/pricing) 创建数据库。
2. 生成 Auth Token。
3. 记下：
   - `TURSO_DATABASE_URL`（形如 `libsql://xxxx.turso.io`）
   - `TURSO_AUTH_TOKEN`

每个部署方应使用**自己的**库；不要共用别人的 Token。

### 3. 在 Vercel 导入你的 Fork

1. 登录 [Vercel](https://vercel.com) → [New Project](https://vercel.com/new)。
2. 授权 GitHub（若尚未授权），选择**你 Fork 后的仓库**（不是别人的上游，除非你有写权限）。
3. 项目设置大致如下（仓库内 `vercel.json` 会覆盖/补全，一般不用手改）：
   - **Framework Preset：** Other / 空即可
   - **Install Command：** `npm ci`
   - **Build Command：** `npm run build`
   - **Output Directory：** `dist/static`
   - **Node.js Version：** `22.x`（Vercel 推荐；包支持 `18.x || 20.x || 22.x`）
4. 环境变量（Production；建议 Preview 也勾上）：
   - `TURSO_DATABASE_URL`（必填）— 你的 Turso URL
   - `TURSO_AUTH_TOKEN`（必填）— 你的 Token
   - `ADMIN_PASSWORD`（可选）— 管理后台口令；不设则无 `/api/admin/*`
5. Deploy。成功后 Vercel 会分配 `https://项目名-….vercel.app`（以控制台显示为准）。

之后对该 GitHub 仓库的 push / PR，会按 Vercel 的 Git 集成自动 Preview / Production 部署。

### 4. 公开访问（关闭登录墙）

部分账号/Team 会默认开启 **Vercel Authentication（SSO Protection）**，未登录访客只能看到 Vercel 登录页。

公开笔记站请关闭：

**Project → Settings → Deployment Protection → 关闭 Production 的 Vercel Authentication。**

自检（把主机名换成你的部署域名）：

```bash
curl -sI https://YOUR_DEPLOYMENT_HOST/ | head -n1

curl -sS -X POST https://YOUR_DEPLOYMENT_HOST/api/notes \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"hello\",\"format\":\"text\"}"
```

---

## 架构一览

```text
浏览器
  ├─ /*、/edit、/note、/admin、/docs  → Vercel 静态（dist/static）
  ├─ /api/*                          → api/index.ts → Fastify（Serverless）
  └─ /raw/*                          → rewrite 到同一函数 → Fastify
                                        └─ Turso (libSQL HTTP)
```

关键文件：

- `vercel.json` — 构建命令、静态目录、函数配置、路由 rewrite
- `api/index.ts` — Vercel 函数入口 → `vercel-handler`
- `src/server/vercel-handler.ts` — 组装 Fastify（仅 Turso，不 `listen`）
- `src/server/app-core.ts` — CLI / Vercel 共用路由装配

本地可参考根目录 `.env.example`。**不要**提交 `.env`（已在 `.gitignore`）。

---

## 可选：CLI 部署

适合本地改完立刻上线、或尚未 push 时：

```bash
cd PlainNote
npm ci
npx vercel login
npx vercel link --yes --project YOUR_PROJECT --scope YOUR_TEAM_OR_USER
# 按提示添加环境变量，或在控制台配置
npx vercel deploy --yes --prod --scope YOUR_TEAM_OR_USER
```

`.env` / `.vercel` 会被 ignore，不会随 CLI 上传密钥文件。改环境变量后需重新 Deploy。

---

## `vercel.json` 在做什么

- 静态资源走 CDN；磁盘上已有文件优先于 rewrite。
- `/api/*`、`/raw/*` 进入同一个 Serverless 函数，由 Fastify 按**对外路径**路由。
- SPA 路径回退到 `index.html`。
- `includeFiles` 把敏感词库打进函数包。
- `better-sqlite3` 在 `optionalDependencies`；Vercel 上只用 `@libsql/client/http`。

---

## 本地 CLI vs Vercel

- **入口**
  - 本地：`node dist/cli.js` listen
  - Vercel：`api/index.ts` Serverless
- **数据库**
  - 本地：SQLite 或 Turso
  - Vercel：**仅 Turso**
- **Admin 口令**
  - 本地：可写 `admin.password`
  - Vercel：仅 `ADMIN_PASSWORD`
- **静态资源**
  - 本地：Fastify static
  - Vercel：CDN
- **冷启动**
  - 本地：无
  - Vercel：有

---

## 什么时候才需要改代码？

Fork 标准部署通常**不用改**。仅在这些情况才考虑动代码或配置：

- **默认分支没有 `vercel.json` / `api/`** — 换含这些文件的分支，或把该提交合并进默认分支
- **想改构建命令 / 输出目录** — 改 `vercel.json`（或 Vercel 控制台覆盖）
- **想拆多个 Serverless 函数** — 自改 `api/` 与 rewrite（进阶，非必须）
- **坚持不用 Turso** — 不适合当前 Vercel 形态；请用本机/VPS + SQLite，或自行接其他云库
- **自定义域名** — 控制台 Domains 绑定即可，一般不用改代码

---

## 常见问题

**构建卡在 `better-sqlite3` / Node 版本**  
Vercel 项目建议选 Node `22.x`；`better-sqlite3` 保持为 optional。

**POST `/api/notes` 成功，GET `/api/notes/:id` 或 `/raw/:id` 变成平台 `NOT_FOUND`**  
确认部署分支仍包含 `vercel.json` 里把 `/api/(.*)`、`/raw/(.*)` rewrite 到 `/api` 的配置。

**改了环境变量仍报缺 Token**  
重新触发一次 Production Deploy。

**首页能开、接口 500**  
在 Vercel 部署日志 / Runtime Logs 中查；优先核对 Turso URL 与 Token。

---

## 发布清单（Fork 用户）

1. [ ] 已 Fork 到自己的 GitHub
2. [ ] 自己的 Turso 库 + Token
3. [ ] Vercel 导入的是**你的 Fork**
4. [ ] 环境变量已配（Production，建议含 Preview）
5. [ ] 部署分支含 `vercel.json` 与 `api/index.ts`
6. [ ] Build 成功
7. [ ] 已关闭 Vercel Authentication（若需完全公开）
8. [ ] 匿名可打开首页；`POST /api/notes` 与 `/raw/:id` 可用
9. [ ] （可选）`ADMIN_PASSWORD` + `/admin`

---

## 相关链接

- Vercel：https://vercel.com/docs
- Turso：https://turso.tech/pricing
- 仓库说明：[README.zh-CN.md](../README.zh-CN.md)
