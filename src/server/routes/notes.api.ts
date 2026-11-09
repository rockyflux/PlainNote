import type { FastifyInstance } from 'fastify';
import type { NoteService } from '../services/note.service.js';
import { resolveOrigin } from '../http/origin.js';
import { resolveAcceptLanguage, resolveClientIp } from '../http/client-meta.js';
import { AppError, ErrorCode } from '../http/errors.js';

export function registerNoteApiRoutes(app: FastifyInstance, service: NoteService): void {
  // 注意：/api/notes/by-secret/:secret 必须先于 /api/notes/:id 注册，避免被 :id 捕获。

  app.post('/api/notes', async (request, reply) => {
    let body: unknown;
    try {
      body = request.body;
    } catch {
      throw new AppError(400, ErrorCode.BAD_REQUEST, '请求体不是合法 JSON');
    }
    if (typeof body !== 'object' || body === null) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, '请求体必须是 JSON 对象');
    }
    const created = await service.create(
      resolveOrigin(request),
      body as Record<string, unknown>,
      {
        ip: resolveClientIp(request),
        acceptLanguage: resolveAcceptLanguage(request),
      },
    );
    reply.status(201).send(created);
  });

  app.get('/api/notes/by-secret/:secret', async (request, reply) => {
    const { secret } = request.params as { secret: string };
    const note = await service.getFullBySecret(resolveOrigin(request), secret);
    reply.send(note);
  });

  app.get('/api/notes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    reply.send(await service.getPublic(id));
  });

  app.patch('/api/notes/:secret', async (request, reply) => {
    const { secret } = request.params as { secret: string };
    let body: unknown;
    try {
      body = request.body;
    } catch {
      throw new AppError(400, ErrorCode.BAD_REQUEST, '请求体不是合法 JSON');
    }
    if (typeof body !== 'object' || body === null) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, '请求体必须是 JSON 对象');
    }
    const updated = await service.update(
      resolveOrigin(request),
      secret,
      body as Record<string, unknown>,
    );
    reply.send(updated);
  });

  app.delete('/api/notes/:secret', async (request, reply) => {
    const { secret } = request.params as { secret: string };
    await service.remove(secret);
    reply.send({ ok: true });
  });
}
