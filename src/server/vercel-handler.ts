import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildPlainNoteApp, type PlainNoteApp } from './app-core.js';
import { resolveAdminCredentials } from './admin/credentials.js';
import { TursoNoteRepository } from './store/turso.js';

type NodeHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

let boot: Promise<PlainNoteApp> | undefined;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for Vercel deployment`);
  }
  return value;
}

function headerValue(
  headers: IncomingMessage['headers'],
  name: string,
): string | undefined {
  const raw = headers[name];
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && raw[0]?.trim()) return raw[0].trim();
  return undefined;
}

function splitUrl(raw: string): { path: string; search: string } {
  const q = raw.indexOf('?');
  if (q < 0) return { path: raw || '/', search: '' };
  return { path: raw.slice(0, q) || '/', search: raw.slice(q) };
}

function isFunctionEntryPath(path: string): boolean {
  return (
    path === '/api' ||
    path === '/api/' ||
    path === '/api/index' ||
    path === '/api/index.ts'
  );
}

/**
 * Restore the public request URL after vercel.json rewrites to `/api`.
 * Only consult forwarded headers when the request already landed on the
 * function entry path — never override a full `/api/notes/...` URL.
 */
export function normalizeVercelRequestUrl(
  url: string | undefined,
  headers: IncomingMessage['headers'] = {},
): string {
  let raw = url && url.length > 0 ? url : '/';
  let { path, search } = splitUrl(raw);

  if (isFunctionEntryPath(path)) {
    const forwarded =
      headerValue(headers, 'x-forwarded-uri') ||
      headerValue(headers, 'x-vercel-forwarded-path') ||
      headerValue(headers, 'x-matched-path');
    if (forwarded && !isFunctionEntryPath(splitUrl(forwarded).path)) {
      raw = forwarded;
      ({ path, search } = splitUrl(raw));
    }
  }

  if (path === '/api/raw' || path.startsWith('/api/raw/')) {
    return `${path.slice('/api'.length)}${search}`;
  }
  return path + search;
}

async function getApp(): Promise<PlainNoteApp> {
  if (!boot) {
    boot = (async () => {
      const url = requireEnv('TURSO_DATABASE_URL');
      const authToken = requireEnv('TURSO_AUTH_TOKEN');

      const admin = resolveAdminCredentials({
        dbPath: ':memory:',
        passwordOverride: process.env.ADMIN_PASSWORD,
        ephemeral: true,
      });

      const repository = await TursoNoteRepository.connect({ url, authToken });

      return buildPlainNoteApp({
        repository,
        storeLabel: url,
        storeKind: 'turso',
        // Static assets are served by Vercel CDN from dist/static.
        staticDir: undefined,
        adminPassword: admin?.password,
        trustProxy: true,
      });
    })().catch((err) => {
      boot = undefined;
      throw err;
    });
  }
  return boot;
}

/**
 * Vercel Node.js serverless entry: reuse Fastify without listen().
 * Intentionally imports Turso only (never better-sqlite3).
 */
export async function handleVercelRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const server = await getApp();
  await server.app.ready();

  req.url = normalizeVercelRequestUrl(req.url, req.headers);

  await new Promise<void>((resolve, reject) => {
    const onFinish = () => {
      cleanup();
      resolve();
    };
    const onClose = () => {
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      res.off('finish', onFinish);
      res.off('close', onClose);
      res.off('error', onError);
    };

    res.on('finish', onFinish);
    res.on('close', onClose);
    res.on('error', onError);

    server.app.server.emit('request', req, res);
  });
}

export const vercelHandler: NodeHandler = (req, res) => {
  void handleVercelRequest(req, res).catch((err) => {
    console.error('[plainnote] vercel handler error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Internal Server Error\n');
    } else {
      res.end();
    }
  });
};

export default vercelHandler;
