import type { NoteRepository } from './types.js';

export interface CreateNoteRepositoryOptions {
  dbPath: string;
  tursoUrl?: string;
  tursoAuthToken?: string;
  /** When true, never load better-sqlite3 (Vercel / serverless). */
  tursoOnly?: boolean;
}

export interface CreatedNoteRepository {
  repository: NoteRepository;
  /** Safe label for logs (never includes auth token). */
  label: string;
  kind: 'sqlite' | 'turso';
}

/**
 * Prefer Turso when `TURSO_DATABASE_URL` (or options.tursoUrl) is set;
 * otherwise fall back to local SQLite at dbPath (unless tursoOnly).
 *
 * SQLite is loaded via dynamic import so Vercel bundles never pull in better-sqlite3.
 */
export async function createNoteRepository(
  options: CreateNoteRepositoryOptions,
): Promise<CreatedNoteRepository> {
  const url = (options.tursoUrl ?? process.env.TURSO_DATABASE_URL ?? '').trim();
  const authToken = (options.tursoAuthToken ?? process.env.TURSO_AUTH_TOKEN ?? '').trim();
  const tursoOnly = options.tursoOnly === true || process.env.VERCEL === '1';

  if (url) {
    if (!authToken) {
      throw new Error(
        'TURSO_AUTH_TOKEN is required when TURSO_DATABASE_URL is set. Create a token in the Turso dashboard.',
      );
    }
    const { TursoNoteRepository } = await import('./turso.js');
    const repository = await TursoNoteRepository.connect({ url, authToken });
    return { repository, label: url, kind: 'turso' };
  }

  if (tursoOnly) {
    throw new Error(
      'Turso is required in this environment (VERCEL). Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.',
    );
  }

  const { SqliteNoteRepository } = await import('./sqlite.js');
  const repository = new SqliteNoteRepository(options.dbPath);
  return { repository, label: options.dbPath, kind: 'sqlite' };
}
