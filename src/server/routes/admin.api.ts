import type { FastifyInstance } from 'fastify';
import type { NoteService } from '../services/note.service.js';
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

/**
 * 管理端仅提供登录校验与笔记列表。
 * 查看 / 修改 / 删除仍走公开的 `/api/notes/:secret`（凭 note secret，无需管理口令）。
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
    if (typeof body !== 'object' || body === null) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, '请求体必须是 JSON 对象');
    }
    const password = (body as { password?: unknown }).password;
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
    const result = service.listForAdmin({
      page: parsePositiveInt(query.page, 1),
      pageSize: parsePositiveInt(query.pageSize, DEFAULT_PAGE_SIZE),
      q: typeof query.q === 'string' ? query.q : undefined,
    });
    reply.send(result);
  });
}
