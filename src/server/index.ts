import { buildPlainNoteApp, type PlainNoteApp } from './app-core.js';
import { createNoteRepository } from './store/create.js';
import type { NoteRepository } from './store/types.js';

export interface ServerOptions {
  dbPath: string;
  /** When omitted / empty, static file hosting is skipped (serverless). */
  staticDir?: string;
  /** 敏感词库路径；默认 server/data/sensitive.txt */
  sensitivePath?: string;
  /** 管理后台口令；未提供则不注册管理 API。 */
  adminPassword?: string;
  /** Turso / libSQL URL；也可用环境变量 TURSO_DATABASE_URL。 */
  tursoUrl?: string;
  /** Turso auth token；也可用环境变量 TURSO_AUTH_TOKEN。 */
  tursoAuthToken?: string;
  /** Force Turso only (no better-sqlite3). Also implied when VERCEL=1. */
  tursoOnly?: boolean;
  /** Trust X-Forwarded-* (needed behind Vercel / reverse proxies). */
  trustProxy?: boolean | number | string | string[];
}

export type PlainNoteServer = PlainNoteApp;

export async function createServer(options: ServerOptions): Promise<PlainNoteServer> {
  const { repository, label, kind } = await createNoteRepository({
    dbPath: options.dbPath,
    tursoUrl: options.tursoUrl,
    tursoAuthToken: options.tursoAuthToken,
    tursoOnly: options.tursoOnly,
  });

  return buildPlainNoteApp({
    repository,
    storeLabel: label,
    storeKind: kind,
    staticDir: options.staticDir,
    sensitivePath: options.sensitivePath,
    adminPassword: options.adminPassword,
    trustProxy: options.trustProxy,
  });
}

export type { NoteRepository };
