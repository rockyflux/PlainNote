import { createRequire } from 'node:module';
import Fastify, { type FastifyInstance } from 'fastify';
import type { NoteRepository } from './store/types.js';
import { NoteService } from './services/note.service.js';
import {
  SensitiveFilter,
  defaultSensitivePath,
  resolveSensitiveLexiconPath,
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

export interface AppCoreOptions {
  repository: NoteRepository;
  storeLabel: string;
  storeKind: 'sqlite' | 'turso';
  /** When omitted / empty, static file hosting is skipped (serverless). */
  staticDir?: string;
  sensitivePath?: string;
  adminPassword?: string;
  trustProxy?: boolean | number | string | string[];
  logLevel?: string;
}

export interface PlainNoteApp {
  app: FastifyInstance;
  storeLabel: string;
  storeKind: 'sqlite' | 'turso';
  repository: NoteRepository;
  close(): Promise<void>;
}

/** Shared Fastify wiring for CLI listen() and Vercel serverless. */
export async function buildPlainNoteApp(options: AppCoreOptions): Promise<PlainNoteApp> {
  const app = Fastify({
    logger: {
      level: options.logLevel ?? (process.env.VERCEL === '1' ? 'warn' : 'info'),
      serializers: {
        req: safeReqSerializer,
      },
    },
    trustProxy: options.trustProxy ?? process.env.VERCEL === '1',
  });

  registerErrorHandler(app);
  registerSecurityHooks(app);

  const sensitivePath =
    options.sensitivePath?.trim() ||
    resolveSensitiveLexiconPath() ||
    defaultSensitivePath();
  const sensitive = SensitiveFilter.loadFromFile(sensitivePath);
  app.log.info(`sensitive lexicon loaded: ${sensitive.size} terms from ${sensitivePath}`);

  const service = new NoteService(
    options.repository,
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

  const staticDir = options.staticDir?.trim();
  if (staticDir) {
    registerStaticRoutes(app, staticDir);
  }

  return {
    app,
    storeLabel: options.storeLabel,
    storeKind: options.storeKind,
    repository: options.repository,
    async close() {
      await app.close();
      await options.repository.close();
    },
  };
}
