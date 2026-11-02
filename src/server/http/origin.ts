import type { FastifyRequest } from 'fastify';

/**
 * 从单值或数组请求头中取出首段（反向代理常写成逗号列表或数组）。
 */
function firstHeaderValue(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value.split(',')[0]?.trim() ?? '';
  if (Array.isArray(value)) return value[0]?.split(',')[0]?.trim() ?? '';
  return '';
}

/**
 * 规范化对外 origin：
 * - Host 带 :443 → https，并去掉端口
 * - Host 带 :80 → http，并去掉端口
 * - https/http 的默认端口一律省略
 */
export function canonicalizeOrigin(proto: string, host: string): string {
  let scheme = proto.replace(/:$/, '').toLowerCase() === 'https' ? 'https' : 'http';

  let hostname = host.trim();
  let port = '';

  if (hostname.startsWith('[')) {
    const m = hostname.match(/^(\[[^\]]+\])(?::(\d+))?$/);
    if (m) {
      hostname = m[1]!;
      port = m[2] ?? '';
    }
  } else {
    const idx = hostname.lastIndexOf(':');
    if (idx > 0 && /^\d+$/.test(hostname.slice(idx + 1))) {
      port = hostname.slice(idx + 1);
      hostname = hostname.slice(0, idx);
    }
  }

  if (port === '443') {
    scheme = 'https';
    port = '';
  } else if (port === '80') {
    scheme = 'http';
    port = '';
  }

  return port ? `${scheme}://${hostname}:${port}` : `${scheme}://${hostname}`;
}

/**
 * 根据请求头拼接同源 origin。
 * 优先 X-Forwarded-Proto / Forwarded；Host 含 :443 时强制 https 并省略端口。
 */
export function resolveOrigin(req: FastifyRequest): string {
  let proto = firstHeaderValue(req.headers['x-forwarded-proto']);

  if (!proto) {
    const forwarded = firstHeaderValue(req.headers['forwarded']);
    const match = forwarded.match(/(?:^|;)\s*proto=([^;]+)/i);
    if (match?.[1]) proto = match[1].trim().replace(/^"|"$/g, '');
  }

  if (!proto) proto = req.protocol;

  const host =
    firstHeaderValue(req.headers['x-forwarded-host']) ||
    firstHeaderValue(req.headers.host) ||
    'localhost';

  return canonicalizeOrigin(proto, host);
}
