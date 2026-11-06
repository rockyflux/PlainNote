import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { dirname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 托管 Vite 构建产物，并为前端 history 路由提供 index.html 回退。
 * /api/* 与 /raw/* 已在其它路由注册；未匹配的 API 路径由全局 notFoundHandler 返回 JSON 404。
 */
export function registerStaticRoutes(app: FastifyInstance, staticDir: string): void {
  app.register(fastifyStatic, {
    root: staticDir,
    prefix: '/',
    wildcard: false,
    decorateReply: true,
    index: false,
  });

  const serveIndex = (_request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Cache-Control', 'no-store').sendFile('index.html');
  };

  app.get('/', serveIndex);
  app.get('/docs', serveIndex);
  app.get('/zh/docs', serveIndex);
  app.get('/admin', serveIndex);
  app.get('/edit/:secret', serveIndex);
  app.get('/note/:id', serveIndex);

  // 其余 GET 请求：静态文件直接服务；前端 history 路径回退到单页入口。
  app.get('/*', (request: FastifyRequest, reply: FastifyReply) => {
    if (request.url.startsWith('/api/') || request.url.startsWith('/raw/')) {
      return reply.callNotFound();
    }

    const rel = decodeURIComponent(request.url.replace(/^\//, '').split('?')[0]);
    const safePath = normalize(join(staticDir, rel));
    const insideRoot = safePath.startsWith(normalize(staticDir) + sep);

    if (rel && insideRoot && existsSync(safePath)) {
      return reply.sendFile(rel);
    }
    reply.header('Cache-Control', 'no-store').sendFile('index.html');
  });
}

/** 相对本模块定位包内前端产物（npx / 全局安装时不依赖 process.cwd）。 */
export function defaultStaticDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // 生产：dist/server/routes/static.js → dist/static
  const fromDist = join(here, '..', '..', 'static');
  if (existsSync(fromDist)) return fromDist;
  // 开发：tsx 跑 src/server/routes/static.ts → 仓库根 dist/static
  return join(here, '..', '..', '..', 'dist', 'static');
}
