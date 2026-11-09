import type { FastifyInstance } from 'fastify';
import type { NoteService } from '../services/note.service.js';
import { AppError } from '../http/errors.js';

export function registerRawRoute(app: FastifyInstance, service: NoteService): void {
  app.get('/raw/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    reply
      .header('X-Content-Type-Options', 'nosniff')
      .header('Content-Disposition', 'inline')
      .header('Cache-Control', 'no-store');

    try {
      const { content } = await service.getRawContent(id);
      reply.header('Content-Type', 'text/plain; charset=utf-8').send(content);
    } catch (err) {
      if (err instanceof AppError && err.status === 404) {
        reply
          .status(404)
          .header('Content-Type', 'text/plain; charset=utf-8')
          .send('Note not found\n');
        return;
      }
      app.log.error(err);
      reply
        .status(500)
        .header('Content-Type', 'text/plain; charset=utf-8')
        .send('Internal server error\n');
    }
  });
}
