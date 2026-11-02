/** 笔记正文格式：纯文本不渲染；Markdown 走白名单渲染。 */
export type NoteFormat = 'text' | 'markdown';

/** 数据库中的笔记记录（蛇形列名，与 DDL 对齐）。 */
export interface NoteRecord {
  id: string;
  secret: string;
  title: string | null;
  content: string;
  format: NoteFormat;
  ip: string | null;
  timezone: string | null;
  language: string | null;
  created_at: number;
  updated_at: number;
  ttl_expires_at: number | null;
}

/** 创建时写入的字段（id/secret/时间戳由服务层或仓储生成）。 */
export interface CreateNoteInput {
  id: string;
  secret: string;
  title: string | null;
  content: string;
  format: NoteFormat;
  ip: string | null;
  timezone: string | null;
  language: string | null;
  createdAt: number;
  updatedAt: number;
}

/** 更新补丁：title 恒可传 null（清空）；id/content/format 可选，不传表示不改动。 */
export interface UpdateNotePatch {
  title: string | null;
  /** 新的 public id；不传则保持原 id。 */
  id?: string;
  content?: string;
  format?: NoteFormat;
  updatedAt: number;
}

export interface NoteRepository {
  create(input: CreateNoteInput): NoteRecord;
  findById(id: string): NoteRecord | undefined;
  findBySecret(secret: string): NoteRecord | undefined;
  updateBySecret(secret: string, patch: UpdateNotePatch): NoteRecord | undefined;
  deleteBySecret(secret: string): boolean;
  /** 统计指定 IP 在 sinceMs（含）之后创建的笔记数；ip 为 null 时按空串匹配。 */
  countByIpSince(ip: string | null, sinceMs: number): number;
  /** 在同一 SQLite 事务中执行，保证限流计数与写入原子。 */
  withTransaction<T>(fn: () => T): T;
  close(): void;
}
