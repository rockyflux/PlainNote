import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type {
  CreateNoteInput,
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

interface Stmt {
  insert: Database.Statement;
  findById: Database.Statement<[string], NoteRecord>;
  findBySecret: Database.Statement<[string], NoteRecord>;
  update: Database.Statement;
  delete: Database.Statement;
  countByIpSince: Database.Statement;
}

function migrateColumns(db: Database.Database): void {
  const cols = db.prepare(`PRAGMA table_info(notes)`).all() as Array<{ name: string }>;
  const names = new Set(cols.map((c) => c.name));
  // 旧库无 format：存量笔记一律按 markdown 兼容（产品原先只渲染 MD）。
  if (!names.has('format')) {
    db.exec(`ALTER TABLE notes ADD COLUMN format TEXT NOT NULL DEFAULT 'markdown'`);
  }
  if (!names.has('ip')) {
    db.exec(`ALTER TABLE notes ADD COLUMN ip TEXT`);
  }
  if (!names.has('timezone')) {
    db.exec(`ALTER TABLE notes ADD COLUMN timezone TEXT`);
  }
  if (!names.has('language')) {
    db.exec(`ALTER TABLE notes ADD COLUMN language TEXT`);
  }
}

export class SqliteNoteRepository implements NoteRepository {
  private readonly db: Database.Database;
  private readonly stmt: Stmt;

  constructor(dbPath: string) {
    const absolute = resolve(dbPath);
    mkdirSync(dirname(absolute), { recursive: true });

    try {
      this.db = new Database(absolute);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      this.db.exec(SCHEMA);
      migrateColumns(this.db);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(
        `数据库文件无法打开或已损坏：${absolute}\n原因：${detail}\n请检查文件是否存在、权限是否可读，或更换 --db 路径后重试。`,
      );
    }

    this.stmt = {
      insert: this.db.prepare(
        `INSERT INTO notes (id, secret, title, content, format, ip, timezone, language, created_at, updated_at, ttl_expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      ),
      findById: this.db.prepare(`SELECT ${SELECT_COLS} FROM notes WHERE id = ?`),
      findBySecret: this.db.prepare(`SELECT ${SELECT_COLS} FROM notes WHERE secret = ?`),
      update: this.db.prepare(
        `UPDATE notes
         SET id = CASE WHEN ? IS NULL THEN id ELSE ? END,
             title = ?,
             content = CASE WHEN ? IS NULL THEN content ELSE ? END,
             format = CASE WHEN ? IS NULL THEN format ELSE ? END,
             updated_at = ?
         WHERE secret = ?`,
      ),
      delete: this.db.prepare(`DELETE FROM notes WHERE secret = ?`),
      countByIpSince: this.db.prepare(
        `SELECT COUNT(*) AS cnt FROM notes WHERE ip IS ? AND created_at >= ?`,
      ),
    };
  }

  countByIpSince(ip: string | null, sinceMs: number): number {
    const row = this.stmt.countByIpSince.get(ip, sinceMs) as { cnt: number } | undefined;
    return row?.cnt ?? 0;
  }

  withTransaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  create(input: CreateNoteInput): NoteRecord {
    this.stmt.insert.run(
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
    );
    const record = this.findById(input.id);
    if (!record) throw new Error('Created note could not be read back');
    return record;
  }

  findById(id: string): NoteRecord | undefined {
    return this.stmt.findById.get(id);
  }

  findBySecret(secret: string): NoteRecord | undefined {
    return this.stmt.findBySecret.get(secret);
  }

  updateBySecret(secret: string, patch: UpdateNotePatch): NoteRecord | undefined {
    this.stmt.update.run(
      patch.id ?? null,
      patch.id ?? null,
      patch.title,
      patch.content ?? null,
      patch.content ?? null,
      patch.format ?? null,
      patch.format ?? null,
      patch.updatedAt,
      secret,
    );
    return this.findBySecret(secret);
  }

  deleteBySecret(secret: string): boolean {
    const result = this.stmt.delete.run(secret);
    return result.changes > 0;
  }

  close(): void {
    this.db.close();
  }
}
