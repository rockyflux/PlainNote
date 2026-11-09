# PlainNote

[English](README.md) | **中文**

**项目地址：** https://github.com/rockyflux/plainnote

匿名、免登录、可被 `curl` / 脚本 / LLM 直接消费的轻量 Markdown 笔记服务。写一次，同时得到 **私有编辑链接、网页只读链接、Raw 纯文本链接**。

- 极简记事本体验 + 可编程 Raw 访问；**网页 Markdown 渲染阅读**（白名单清洗）为本产品能力。
- 技术栈：**Node.js ≥ 18 · Fastify · better-sqlite3 / Turso(libSQL) · Vite（原生 TypeScript，无前端框架）**
- 默认零外部服务依赖（本地 SQLite）；也可通过 `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` 使用 [Turso](https://turso.tech/pricing) 云端持久化。界面 **中 / 英** 双语，内置 API 文档页 `/zh/docs`、`/docs`

## 三链接模型

| 链接 | 格式 | 权限 | 形态 |
|---|---|---|---|
| 编辑链接（私有） | `/edit/{secret}` | 持链可改 / 可删 / 可改分享码，唯一凭证，丢失不可找回 | HTML 编辑器（双栏 + 实时预览） |
| 网页只读链接 | `/note/{id}` | 任何人只读 | Markdown 渲染网页（DOMPurify 白名单） |
| Raw 纯文本链接 | `/raw/{id}` | 任何人只读 | `text/plain`，无 HTML 包装，按存储原文返回 |

公开 `id`（分享码）默认 10 位，可自定义（6–48 位，`[A-Za-z0-9-]`）。修改后旧的 `/note`、`/raw` 立即失效；编辑用 `secret` 不变。

## 环境要求

- Node.js ≥ 18（开发环境实测 Node 22）
- 仅在无 prebuild 时需本地编译 better-sqlite3（Unix 常见为 `python3`、`make`、`g++`；多数安装会拉预编译二进制）

## 快速开始

### 从源码运行

```bash
npm install
npm run build
npm start
```

默认监听全部网卡（`0.0.0.0:3123`），本机可用 <http://127.0.0.1:3123>，局域网用启动时打印的 `Network` 地址（数据库 `~/.plainnote/plainnote.db`）。

### 开发模式（热更新）

```bash
# 终端 1：后端（tsx watch）
npm run dev:server

# 终端 2：前端 Vite（5173，已代理 /api 与 /raw → 3123）
npm run dev:web
```

### 测试

```bash
# 前端 Markdown XSS 清洗回归（Node + jsdom，12 项断言）
npm test
```

### 命令与参数

```bash
node dist/cli.js [选项]
# 等价
npm start -- [选项]
```

| 参数 / 环境变量 | 默认值 | 说明 |
|---|---|---|
| `-p, --port` / `PORT` | `3123` | 监听端口 |
| `-H, --host` / `HOST` | `0.0.0.0` | 监听地址（仅本机用 `127.0.0.1`） |
| `-d, --db` / `DB_PATH` | `~/.plainnote/plainnote.db` | 本地 SQLite 路径（同目录存 `admin.password`） |
| `TURSO_DATABASE_URL` | 未设置 | Turso URL；设置后走云端库 |
| `TURSO_AUTH_TOKEN` | 未设置 | Turso Token（须与 URL 一起配置） |
| `--sensitive` / `SENSITIVE_PATH` | 包内词库 | 敏感词库路径 |
| `--admin-password` / `ADMIN_PASSWORD` | 首次自动生成 | 设置管理口令 |
| `--show-admin-password` | 否 | 启动时打印已有管理口令 |
| `--no-update-check` / `PLAINNOTE_NO_UPDATE=1` | 开启检测 | 跳过 npm 更新检测 |
| `-h, --help` | — | 帮助 |
| `-V, --version` | — | 版本 |

参数优先级：命令行参数 > 环境变量 > 默认值。

## HTTP API（摘要）

完整 curl 示例见：`/zh/docs`（中文）或 `/docs`（英文）。

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/notes` | 创建笔记 |
| `GET` | `/api/notes/by-secret/:secret` | 完整笔记 + 三条 URL |
| `GET` | `/api/notes/:id` | 公开笔记 |
| `PATCH` | `/api/notes/:secret` | 更新笔记 |
| `DELETE` | `/api/notes/:secret` | 删除笔记 |
| `GET` | `/raw/:id` | 纯文本正文 |
| `POST` | `/api/admin/login` | 管理登录 |
| `GET` | `/api/admin/notes` | 管理端列表 |

**管理后台：** `/admin` — 口令只解锁列表；查看/修改/删除仍凭笔记 `secret`。首次启动会在数据库同目录生成 `admin.password`。

**服务端限制：** 正文 ≤ 30000；标题 ≤ 200；同 IP 约 10 次/分钟、100 次/天；命中敏感词返回 422。

## 工程目录

```
plainnote/
├── test/
│   └── sanitize.mjs            # Markdown XSS 清洗（Node + jsdom）
├── src/
│   ├── cli.ts                  # CLI 入口（commander、优雅关闭）
│   ├── server/                 # Fastify → dist/server
│   │   ├── index.ts
│   │   ├── http/               # 错误、origin、客户端元数据、安全头
│   │   ├── routes/             # JSON API、Raw、静态托管与 history 回退
│   │   ├── services/           # 校验、敏感词、ID/secret、DTO 与链接组装
│   │   ├── data/               # 敏感词库 sensitive.txt（构建时复制到 dist）
│   │   └── store/              # 仓储（SQLite / Turso）
│   └── web/                    # Vite 前端 → dist/static
│       ├── main.ts             # history 路由
│       ├── pages/              # 首页 / 编辑 / 只读 / API 文档
│       ├── components/         # BrandBar / Footer / ErrorView / TopBar
│       ├── lib/                # api、markdown、i18n、history、modal、DOM
│       └── styles.css
├── dist/                       # 构建产物（gitignore）
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 部署

### 使用 Turso（推荐免费云库）

1. 在 [Turso](https://turso.tech/pricing) 创建库并生成 Token。Free 档约：100 库 / 5GB 存储 / 月读 5 亿行、写 1000 万行 / 同步 3GB（以官网为准）。
2. 复制 `.env.example` 为 `.env`（或在平台环境变量中配置）：

```bash
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=你的token
```

3. 启动（会自动建表）：

```bash
npm ci
npm run build
npm start
```

**存储选择（很简单）：**

- 配了 `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` → 走 Turso  
- 没配 `TURSO_DATABASE_URL` → 走本地 SQLite  
- 只配了 URL、没配 Token → 启动失败（不会悄悄回退）

### 本机打包上传

```bash
npm ci
npm run build
npm pack
```

把生成的 `.tgz` 上传到服务器并解压到目标目录，然后安装依赖：

```bash
npm install --omit=dev
```

**宝塔：** 网站 → 添加 Node 项目 → 项目目录选解压目录 → 启动选项选 `start`（即 `node dist/cli.js`）→ 端口 `3123`。再给域名做反向代理到 `http://127.0.0.1:3123`。若用 Turso，在面板里加上上述两个环境变量即可。

无面板时直接：`npm start`（或 `node dist/cli.js`），默认 `0.0.0.0:3123`（局域网可访问）。

## 发布说明

npm 包名为 `plainshare`；CLI bin 为 `plainnote` → `dist/cli.js`。发布前请执行 `npm run build`。

```bash
npm i -g plainshare
plainnote
# 或
npx plainshare
```

## 许可证

MIT（见 `package.json`）。
