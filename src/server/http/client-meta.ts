import type { FastifyRequest } from 'fastify';

/** 解析客户端 IP：优先 X-Forwarded-For 首段，否则 request.ip。 */
export function resolveClientIp(req: FastifyRequest): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  const raw =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]
      : Array.isArray(forwarded)
        ? forwarded[0]
        : undefined;
  const fromHeader = raw?.trim();
  if (fromHeader) return fromHeader.slice(0, 64);

  const ip = typeof req.ip === 'string' ? req.ip.trim() : '';
  return ip ? ip.slice(0, 64) : null;
}

/** 从 Accept-Language 取第一个 language tag，作 body 缺省回退。 */
export function resolveAcceptLanguage(req: FastifyRequest): string | null {
  const header = req.headers['accept-language'];
  const raw = typeof header === 'string' ? header : Array.isArray(header) ? header[0] : '';
  if (!raw) return null;
  const first = raw.split(',')[0]?.trim().split(';')[0]?.trim();
  // 忽略 `*`（部分客户端 / fetch 默认值）等无意义标签
  if (!first || first === '*') return null;
  return first.slice(0, 32);
}
