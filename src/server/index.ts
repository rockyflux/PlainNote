import { createRequire } from 'node:module';
import Fastify, { type FastifyInstance } from 'fastify';
import { createNoteRepository } from './store/create.js';
import type { NoteRepository } from './store/types.js';
import { NoteService } from './services/note.service.js';
import {
  SensitiveFilter,
  defaultSensitivePath,
} from './services/sensitive-filter.js';
import { registerErrorHandler } from './http/errors.js';
import { registerSecurityHooks, safeReqSerializer } from './http/security.js';
import { registerNoteApiRoutes } from './routes/notes.api.js';
import { registerAdminApiRoutes } from './routes/admin.api.js';
import { registerMcpRoutes } from './routes/mcp.js';
import { registerRawRoute } from './routes/raw.js';
import { registerStaticRoutes } from './routes/static.js';

const require = createRequire(import.meta.url);

function resolvePackageVersion(): string {
  try {
    return (require('../../package.json') as { version?: string }).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export interface ServerOptions {
  dbPath: string;
  staticDir: string;
  /** 敏感词库路径；默认 server/data/sensitive.txt */
  sensitivePath?: string;
  /** 管理后台口令；未提供则不注册管理 API。 */
  adminPassword?: string;
  /** Turso / libSQL URL；也可用环境变量 TURSO_DATABASE_URL。 */
  tursoUrl?: string;
  /** Turso auth token；也可用环境变量 TURSO_AUTH_TOKEN。 */
  tursoAuthToken?: string;
}

export interface PlainNoteServer {
  app: FastifyInstance;
  /** Safe store label for startup logs (path or Turso URL). */
  storeLabel: string;
  storeKind: 'sqlite' | 'turso';
  close(): Promise<void>;
}

export async function createServer(options: ServerOptions): Promise<PlainNoteServer> {
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

  const { repository, label, kind } = await createNoteRepository({
    dbPath: options.dbPath,
    tursoUrl: options.tursoUrl,
    tursoAuthToken: options.tursoAuthToken,
  });
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
  if (options.adminPassword) {
    registerAdminApiRoutes(app, service, options.adminPassword);
  }
  registerMcpRoutes(app, service, { version: resolvePackageVersion() });
  registerRawRoute(app, service);
  registerStaticRoutes(app, options.staticDir);

  return {
    app,
    storeLabel: label,
    storeKind: kind,
    async close() {
      await app.close();
      await repository.close();
    },
  };
}

export type { NoteRepository };
