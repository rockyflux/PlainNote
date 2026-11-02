import type { FastifyRequest } from 'fastify';

/**
 * 根据请求头拼接同源 origin。线上反向代理透传 X-Forwarded-Proto 时优先使用。
 */
export function resolveOrigin(req: FastifyRequest): string {
  const forwarded = req.headers['x-forwarded-proto'];
  const proto =
    (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') || req.protocol;
  const host = req.headers.host ?? 'localhost';
  return `${proto}://${host}`;
}
