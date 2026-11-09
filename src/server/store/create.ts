import { SqliteNoteRepository } from './sqlite.js';
import { TursoNoteRepository } from './turso.js';
import type { NoteRepository } from './types.js';

export interface CreateNoteRepositoryOptions {
  dbPath: string;
  tursoUrl?: string;
  tursoAuthToken?: string;
}

export interface CreatedNoteRepository {
  repository: NoteRepository;
  /** Safe label for logs (never includes auth token). */
  label: string;
  kind: 'sqlite' | 'turso';
}

/**
 * Prefer Turso when `TURSO_DATABASE_URL` (or options.tursoUrl) is set;
 * otherwise fall back to local SQLite at dbPath.
 */
export async function createNoteRepository(
  options: CreateNoteRepositoryOptions,
): Promise<CreatedNoteRepository> {
  const url = (options.tursoUrl ?? process.env.TURSO_DATABASE_URL ?? '').trim();
  const authToken = (options.tursoAuthToken ?? process.env.TURSO_AUTH_TOKEN ?? '').trim();

  if (url) {
    if (!authToken) {
      throw new Error(
        'TURSO_AUTH_TOKEN is required when TURSO_DATABASE_URL is set. Create a token in the Turso dashboard.',
      );
    }
    const repository = await TursoNoteRepository.connect({ url, authToken });
    return { repository, label: url, kind: 'turso' };
  }

  const repository = new SqliteNoteRepository(options.dbPath);
  return { repository, label: options.dbPath, kind: 'sqlite' };
}
