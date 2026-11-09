// HTTP client only — avoids native `libsql` / better-sqlite3 on Vercel & remote Turso.
import { createClient, type Client, type Row, type Transaction } from '@libsql/client/http';
import type {
  CreateNoteInput,
  ListNotesQuery,
  NoteFormat,
  NoteRecord,
  NoteRepository,
  UpdateNotePatch,
} from './types.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS notes (
  id              TEXT PRIMARY KEY,
  secret          TEXT NOT NULL UNIQUE,
  title           TEXT,
  content         TEXT NOT NULL,
  format          TEXT NOT NULL DEFAULT 'markdown',
  ip              TEXT,
  timezone        TEXT,
  language        TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  ttl_expires_at  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_notes_secret ON notes (secret);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes (updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_ip_created_at ON notes (ip, created_at);
`;

const SELECT_COLS = `id, secret, title, content, format, ip, timezone, language,
         created_at, updated_at, ttl_expires_at`;

const SEARCH_WHERE = `(
  id LIKE ? ESCAPE '\\'
  OR secret LIKE ? ESCAPE '\\'
  OR IFNULL(title, '') LIKE ? ESCAPE '\\'
  OR content LIKE ? ESCAPE '\\'
  OR IFNULL(ip, '') LIKE ? ESCAPE '\\'
)`;

type Executor = Pick<Client, 'execute'>;

function escapeLike(raw: string): string {
  return raw.replace(/([\\%_])/g, '\\$1');
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function asFormat(value: unknown): NoteFormat {
  return value === 'text' ? 'text' : 'markdown';
}

function mapNote(row: Row): NoteRecord {
  return {
    id: String(row.id),
    secret: String(row.secret),
    title: asNullableString(row.title),
    content: String(row.content),
    format: asFormat(row.format),
    ip: asNullableString(row.ip),
    timezone: asNullableString(row.timezone),
    language: asNullableString(row.language),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
    ttl_expires_at:
      row.ttl_expires_at === null || row.ttl_expires_at === undefined
        ? null
        : Number(row.ttl_expires_at),
  };
}

async function migrateColumns(db: Executor): Promise<void> {
  const info = await db.execute(`PRAGMA table_info(notes)`);
  const names = new Set(info.rows.map((row) => String(row.name)));
  if (!names.has('format')) {
    await db.execute(`ALTER TABLE notes ADD COLUMN format TEXT NOT NULL DEFAULT 'markdown'`);
  }
  if (!names.has('ip')) {
    await db.execute(`ALTER TABLE notes ADD COLUMN ip TEXT`);
  }
  if (!names.has('timezone')) {
    await db.execute(`ALTER TABLE notes ADD COLUMN timezone TEXT`);
  }
  if (!names.has('language')) {
    await db.execute(`ALTER TABLE notes ADD COLUMN language TEXT`);
  }
}

export interface TursoNoteRepositoryOptions {
  url: string;
  authToken: string;
}

export class TursoNoteRepository implements NoteRepository {
  private activeTx: Transaction | null = null;

  private constructor(private readonly client: Client) {}

  static async connect(options: TursoNoteRepositoryOptions): Promise<TursoNoteRepository> {
    const client = createClient({
      url: options.url,
      authToken: options.authToken,
    });
    try {
      for (const statement of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) {
        await client.execute(statement);
      }
      await migrateColumns(client);
    } catch (err) {
      client.close();
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Turso database could not be initialized (${options.url})\nCause: ${detail}`,
      );
    }
    return new TursoNoteRepository(client);
  }

  private executor(): Executor {
    return this.activeTx ?? this.client;
  }

  private searchPattern(q: string): string {
    return `%${escapeLike(q)}%`;
  }

  async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeTx) {
      return fn();
    }
    const tx = await this.client.transaction('write');
    this.activeTx = tx;
    try {
      const result = await fn();
      await tx.commit();
      return result;
    } catch (err) {
      try {
        await tx.rollback();
      } catch {
        // ignore rollback errors
      }
      throw err;
    } finally {
      this.activeTx = null;
    }
  }

  async countByIpSince(ip: string | null, sinceMs: number): Promise<number> {
    const result = await this.executor().execute({
      sql: `SELECT COUNT(*) AS cnt FROM notes WHERE ip IS ? AND created_at >= ?`,
      args: [ip, sinceMs],
    });
    return Number(result.rows[0]?.cnt ?? 0);
  }

  async create(input: CreateNoteInput): Promise<NoteRecord> {
    await this.executor().execute({
      sql: `INSERT INTO notes (id, secret, title, content, format, ip, timezone, language, created_at, updated_at, ttl_expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      args: [
        input.id,
        input.secret,
        input.title,
        input.content,
        input.format,
        input.ip,
        input.timezone,
        input.language,
        input.createdAt,
        input.updatedAt,
      ],
    });
    const record = await this.findById(input.id);
    if (!record) throw new Error('Created note could not be read back');
    return record;
  }

  async findById(id: string): Promise<NoteRecord | undefined> {
    const result = await this.executor().execute({
      sql: `SELECT ${SELECT_COLS} FROM notes WHERE id = ?`,
      args: [id],
    });
    const row = result.rows[0];
    return row ? mapNote(row) : undefined;
  }

  async findBySecret(secret: string): Promise<NoteRecord | undefined> {
    const result = await this.executor().execute({
      sql: `SELECT ${SELECT_COLS} FROM notes WHERE secret = ?`,
      args: [secret],
    });
    const row = result.rows[0];
    return row ? mapNote(row) : undefined;
  }

  async updateBySecret(secret: string, patch: UpdateNotePatch): Promise<NoteRecord | undefined> {
    await this.executor().execute({
      sql: `UPDATE notes
            SET id = CASE WHEN ? IS NULL THEN id ELSE ? END,
                title = ?,
                content = CASE WHEN ? IS NULL THEN content ELSE ? END,
                format = CASE WHEN ? IS NULL THEN format ELSE ? END,
                updated_at = ?
            WHERE secret = ?`,
      args: [
        patch.id ?? null,
        patch.id ?? null,
        patch.title,
        patch.content ?? null,
        patch.content ?? null,
        patch.format ?? null,
        patch.format ?? null,
        patch.updatedAt,
        secret,
      ],
    });
    return this.findBySecret(secret);
  }

  async deleteBySecret(secret: string): Promise<boolean> {
    const result = await this.executor().execute({
      sql: `DELETE FROM notes WHERE secret = ?`,
      args: [secret],
    });
    return result.rowsAffected > 0;
  }

  async deleteOlderThan(updatedBeforeMs: number | null): Promise<number> {
    if (updatedBeforeMs === null) {
      const result = await this.executor().execute(`DELETE FROM notes`);
      return result.rowsAffected;
    }
    const result = await this.executor().execute({
      sql: `DELETE FROM notes WHERE updated_at < ?`,
      args: [updatedBeforeMs],
    });
    return result.rowsAffected;
  }

  async list(query: ListNotesQuery): Promise<NoteRecord[]> {
    const q = query.q?.trim();
    if (!q) {
      const result = await this.executor().execute({
        sql: `SELECT ${SELECT_COLS} FROM notes ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
        args: [query.limit, query.offset],
      });
      return result.rows.map(mapNote);
    }
    const pattern = this.searchPattern(q);
    const result = await this.executor().execute({
      sql: `SELECT ${SELECT_COLS} FROM notes WHERE ${SEARCH_WHERE}
            ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      args: [pattern, pattern, pattern, pattern, pattern, query.limit, query.offset],
    });
    return result.rows.map(mapNote);
  }

  async count(q?: string): Promise<number> {
    const trimmed = q?.trim();
    if (!trimmed) {
      const result = await this.executor().execute(`SELECT COUNT(*) AS cnt FROM notes`);
      return Number(result.rows[0]?.cnt ?? 0);
    }
    const pattern = this.searchPattern(trimmed);
    const result = await this.executor().execute({
      sql: `SELECT COUNT(*) AS cnt FROM notes WHERE ${SEARCH_WHERE}`,
      args: [pattern, pattern, pattern, pattern, pattern],
    });
    return Number(result.rows[0]?.cnt ?? 0);
  }

  close(): void {
    this.client.close();
  }
}
