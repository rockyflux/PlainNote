import type { FastifyInstance, FastifyRequest } from 'fastify';

/** 脱敏 URL 中的 secret 路径段，避免访问日志泄露编辑凭证。 */
export function redactUrl(url: string): string {
  return url
    .replace(/(\/edit\/)[^/?#]+/gi, '$1***')
    .replace(/(\/api\/notes\/by-secret\/)[^/?#]+/gi, '$1***')
    .replace(/(\/api\/notes\/)([A-Za-z0-9_-]{24})(?=[/?#]|$)/g, '$1***');
}

export function registerSecurityHooks(app: FastifyInstance): void {
  app.addHook('onSend', async (_request, reply) => {
    void reply.header('X-Frame-Options', 'SAMEORIGIN');
    void reply.header('X-Content-Type-Options', 'nosniff');
  });
}

/** Fastify req 序列化：只保留 method + 脱敏 URL。 */
export function safeReqSerializer(request: FastifyRequest): { method: string; url: string } {
  return {
    method: request.method,
    url: redactUrl(request.url),
  };
}
