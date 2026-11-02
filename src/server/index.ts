import Fastify, { type FastifyInstance } from 'fastify';
import { SqliteNoteRepository } from './store/sqlite.js';
import { NoteService } from './services/note.service.js';
import {
  SensitiveFilter,
  defaultSensitivePath,
} from './services/sensitive-filter.js';
import { registerErrorHandler } from './http/errors.js';
import { registerSecurityHooks, safeReqSerializer } from './http/security.js';
import { registerNoteApiRoutes } from './routes/notes.api.js';
import { registerRawRoute } from './routes/raw.js';
import { registerStaticRoutes } from './routes/static.js';

export interface ServerOptions {
  dbPath: string;
  staticDir: string;
  /** 敏感词库路径；默认 server/data/sensitive.txt */
  sensitivePath?: string;
}

export interface PlainNoteServer {
  app: FastifyInstance;
  close(): Promise<void>;
}

export function createServer(options: ServerOptions): PlainNoteServer {
  const app = Fastify({
    logger: {
      level: 'info',
      serializers: {
        req: safeReqSerializer,
      },
    },
  });

  registerErrorHandler(app);
  registerSecurityHooks(app);

  const sensitivePath = options.sensitivePath ?? defaultSensitivePath();
  const sensitive = SensitiveFilter.loadFromFile(sensitivePath);
  app.log.info(`sensitive lexicon loaded: ${sensitive.size} terms from ${sensitivePath}`);

  const repository = new SqliteNoteRepository(options.dbPath);
  const service = new NoteService(
    repository,
    {
      info: (msg) => {
        app.log.info(msg);
      },
    },
    sensitive,
  );

  registerNoteApiRoutes(app, service);
  registerRawRoute(app, service);
  registerStaticRoutes(app, options.staticDir);

  return {
    app,
    async close() {
      await app.close();
      repository.close();
    },
  };
}
