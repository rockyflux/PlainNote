import type { FastifyInstance } from 'fastify';
import {
  parseAdminPurgeKeep,
  type NoteService,
} from '../services/note.service.js';
import { resolveClientIp } from '../http/client-meta.js';
import { AppError, ErrorCode } from '../http/errors.js';
import {
  assertAdminPassword,
  LoginRateLimiter,
  safeEqualString,
} from '../admin/auth.js';

const DEFAULT_PAGE_SIZE = 20;

function parsePositiveInt(raw: unknown, fallback: number): number {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function readJsonObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, '请求体必须是 JSON 对象');
  }
  return body as Record<string, unknown>;
}

/**
 * 管理端：登录校验、笔记列表、按保留策略批量清理。
 * 单条查看 / 修改 / 删除仍走公开的 `/api/notes/:secret`（凭 note secret）。
 */
export function registerAdminApiRoutes(
  app: FastifyInstance,
  service: NoteService,
  adminPassword: string,
): void {
  const loginLimiter = new LoginRateLimiter(10, 60_000);

  app.post('/api/admin/login', async (request, reply) => {
    const ip = resolveClientIp(request);
    loginLimiter.assertAllowed(ip);

    let body: unknown;
    try {
      body = request.body;
    } catch {
      throw new AppError(400, ErrorCode.BAD_REQUEST, '请求体不是合法 JSON');
    }
    const password = readJsonObject(body).password;
    if (typeof password !== 'string' || !password) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, '请提供 password');
    }
    if (!safeEqualString(password, adminPassword)) {
      throw new AppError(401, ErrorCode.UNAUTHORIZED, '管理口令无效');
    }
    loginLimiter.clear(ip);
    reply.send({ ok: true });
  });

  app.get('/api/admin/notes', async (request, reply) => {
    assertAdminPassword(request, adminPassword);
    const query = request.query as { page?: string; pageSize?: string; q?: string };
    const result = await service.listForAdmin({
      page: parsePositiveInt(query.page, 1),
      pageSize: parsePositiveInt(query.pageSize, DEFAULT_PAGE_SIZE),
      q: typeof query.q === 'string' ? query.q : undefined,
    });
    reply.send(result);
  });

  app.post('/api/admin/notes/purge', async (request, reply) => {
    assertAdminPassword(request, adminPassword);
    let body: unknown;
    try {
      body = request.body;
    } catch {
      throw new AppError(400, ErrorCode.BAD_REQUEST, '请求体不是合法 JSON');
    }
    const keep = parseAdminPurgeKeep(readJsonObject(body).keep);
    const result = await service.purgeForAdmin(keep);
    reply.send(result);
  });
}
