import { customAlphabet } from 'nanoid';
import type { NoteFormat, NoteRecord, NoteRepository } from '../store/types.js';
import {
  AppError,
  ErrorCode,
  noteNotFound,
  rateLimited,
  validationFailed,
} from '../http/errors.js';
import type { SensitiveFilter } from './sensitive-filter.js';

export const MAX_CONTENT_LENGTH = 30_000;
export const MAX_TITLE_LENGTH = 200;
export const MAX_TIMEZONE_LENGTH = 64;
export const MAX_LANGUAGE_LENGTH = 32;
/** 自定义分享码（public id）长度上下限；生成默认仍为 10 位。 */
export const MIN_ID_LENGTH = 6;
export const MAX_ID_LENGTH = 48;

/** 同一 IP 每分钟最多创建篇数。 */
export const CREATE_RATE_LIMIT_PER_MINUTE = 10;
/** 同一 IP 每个自然日（服务端本地时区）最多创建篇数。 */
export const CREATE_RATE_LIMIT_PER_DAY = 100;
const ONE_MINUTE_MS = 60_000;

const idAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-';
const secretAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
const ID_PATTERN = /^[A-Za-z0-9-]+$/;
const generateId = customAlphabet(idAlphabet, 10);
const generateSecret = customAlphabet(secretAlphabet, 24);

export interface NotePublicDto {
  id: string;
  title: string | null;
  content: string;
  format: NoteFormat;
  createdAt: number;
  updatedAt: number;
}

export interface NoteFullDto extends NotePublicDto {
  secret: string;
  editUrl: string;
  noteUrl: string;
  rawUrl: string;
}

/** 管理端列表项：含 secret，正文仅预览。 */
export interface AdminNoteListItem {
  id: string;
  secret: string;
  title: string | null;
  format: NoteFormat;
  contentPreview: string;
  contentLength: number;
  ip: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface AdminNoteListResult {
  items: AdminNoteListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** 管理端清理：清空全部，或只保留最近一段时间内有更新的笔记。 */
export type AdminPurgeKeep = 'all' | '7d' | '30d' | '90d' | '180d' | '365d';

export interface AdminPurgeResult {
  deleted: number;
  keep: AdminPurgeKeep;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const PURGE_KEEP_MS: Record<Exclude<AdminPurgeKeep, 'all'>, number> = {
  '7d': 7 * DAY_MS,
  '30d': 30 * DAY_MS,
  '90d': 90 * DAY_MS,
  '180d': 180 * DAY_MS,
  '365d': 365 * DAY_MS,
};

export function parseAdminPurgeKeep(raw: unknown): AdminPurgeKeep {
  if (
    raw === 'all' ||
    raw === '7d' ||
    raw === '30d' ||
    raw === '90d' ||
    raw === '180d' ||
    raw === '365d'
  ) {
    return raw;
  }
  throw new AppError(
    400,
    ErrorCode.BAD_REQUEST,
    'keep 必须是 all / 7d / 30d / 90d / 180d / 365d',
  );
}

const PREVIEW_MAX = 160;

export interface CreateNoteBody {
  title?: string | null;
  content?: string;
  format?: string;
  timezone?: string | null;
  language?: string | null;
}

export interface UpdateNoteBody {
  title?: string | null;
  content?: string;
  format?: string;
  /** 自定义分享码，写入后网页/Raw 链接同步变更。 */
  id?: string;
}

/** 服务端注入的创建上下文（IP / Accept-Language 回退）。 */
export interface CreateNoteContext {
  ip: string | null;
  acceptLanguage: string | null;
}

export interface NoteServiceLogger {
  info(message: string): void;
}

const codePointLength = (text: string): number => [...text].length;

function sanitizeTitle(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') {
    throw validationFailed({ title: '标题必须是文本' });
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (codePointLength(trimmed) > MAX_TITLE_LENGTH) {
    throw validationFailed({ title: `标题长度不能超过 ${MAX_TITLE_LENGTH} 字符` });
  }
  return trimmed;
}

function requireContent(raw: unknown): string {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw validationFailed({ content: '正文为必填项' });
  }
  if (codePointLength(raw) > MAX_CONTENT_LENGTH) {
    throw validationFailed(
      { content: `正文长度需在 1 到 ${MAX_CONTENT_LENGTH} 之间` },
      '内容超出长度限制',
    );
  }
  return raw;
}

function optionalContent(raw: unknown): string | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw validationFailed({ content: '正文不能为空' });
  }
  if (codePointLength(raw) > MAX_CONTENT_LENGTH) {
    throw validationFailed(
      { content: `正文长度需在 1 到 ${MAX_CONTENT_LENGTH} 之间` },
      '内容超出长度限制',
    );
  }
  return raw;
}

function sanitizeFormat(raw: unknown, fallback: NoteFormat): NoteFormat {
  if (raw === undefined || raw === null || raw === '') return fallback;
  if (raw !== 'text' && raw !== 'markdown') {
    throw validationFailed({ format: 'format 仅支持 text 或 markdown' });
  }
  return raw;
}

function optionalFormat(raw: unknown): NoteFormat | undefined {
  if (raw === undefined) return undefined;
  return sanitizeFormat(raw, 'text');
}

/** 校验并规范化自定义分享码；未传返回 undefined（表示不改）。 */
function optionalId(raw: unknown): string | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string') {
    throw validationFailed({ id: '分享码必须是文本' });
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    throw validationFailed({ id: '分享码不能为空' });
  }
  const len = codePointLength(trimmed);
  if (len < MIN_ID_LENGTH || len > MAX_ID_LENGTH) {
    throw validationFailed({
      id: `分享码长度需在 ${MIN_ID_LENGTH} 到 ${MAX_ID_LENGTH} 之间`,
    });
  }
  if (!ID_PATTERN.test(trimmed)) {
    throw validationFailed({ id: '分享码仅支持字母、数字与短横线' });
  }
  return trimmed;
}

function sanitizeOptionalMeta(
  raw: unknown,
  field: 'timezone' | 'language',
  max: number,
): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') {
    throw validationFailed({ [field]: `${field} 必须是文本` });
  }
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (codePointLength(trimmed) > max) {
    throw validationFailed({ [field]: `${field} 长度不能超过 ${max} 字符` });
  }
  return trimmed;
}

/** 服务端本地时区当天 00:00:00.000 的时间戳。 */
function startOfLocalDay(nowMs: number): number {
  const d = new Date(nowMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export class NoteService {
  constructor(
    private readonly repo: NoteRepository,
    private readonly log?: NoteServiceLogger,
    private readonly sensitive?: SensitiveFilter,
  ) {}

  async create(
    origin: string,
    body: CreateNoteBody,
    ctx: CreateNoteContext,
  ): Promise<NoteFullDto> {
    const title = sanitizeTitle(body.title);
    const content = requireContent(body.content);
    this.sensitive?.assertClean(title, content);
    const format = sanitizeFormat(body.format, 'text');
    const timezone = sanitizeOptionalMeta(body.timezone, 'timezone', MAX_TIMEZONE_LENGTH);
    const language =
      sanitizeOptionalMeta(body.language, 'language', MAX_LANGUAGE_LENGTH) ??
      (ctx.acceptLanguage
        ? sanitizeOptionalMeta(ctx.acceptLanguage, 'language', MAX_LANGUAGE_LENGTH)
        : null);
    const now = Date.now();

    const record = await this.repo.withTransaction(async () => {
      await this.assertCreateRateLimit(ctx.ip, now);

      // id 极小概率冲突时重试最多 3 次
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const id = generateId();
        const secret = generateSecret();
        try {
          return await this.repo.create({
            id,
            secret,
            title,
            content,
            format,
            ip: ctx.ip,
            timezone,
            language,
            createdAt: now,
            updatedAt: now,
          });
        } catch (err) {
          if (attempt === 2) throw err;
        }
      }
      throw new AppError(500, ErrorCode.INTERNAL_ERROR, '创建失败，请重试');
    });

    this.log?.info(`create id=${record.id} format=${record.format}`);
    return this.toFull(origin, record);
  }

  /** 按 IP 限制创建频率：每分钟 ≤10，当天 ≤100。 */
  private async assertCreateRateLimit(ip: string | null, nowMs: number): Promise<void> {
    const minuteSince = nowMs - ONE_MINUTE_MS;
    const minuteCount = await this.repo.countByIpSince(ip, minuteSince);
    if (minuteCount >= CREATE_RATE_LIMIT_PER_MINUTE) {
      throw rateLimited(
        `创建过于频繁：同一 IP 每分钟最多创建 ${CREATE_RATE_LIMIT_PER_MINUTE} 篇，请稍后再试`,
        60,
      );
    }

    const daySince = startOfLocalDay(nowMs);
    const dayCount = await this.repo.countByIpSince(ip, daySince);
    if (dayCount >= CREATE_RATE_LIMIT_PER_DAY) {
      const msUntilTomorrow = daySince + 24 * 60 * 60 * 1000 - nowMs;
      const retryAfter = Math.max(1, Math.ceil(msUntilTomorrow / 1000));
      throw rateLimited(
        `今日创建已达上限：同一 IP 每天最多创建 ${CREATE_RATE_LIMIT_PER_DAY} 篇，请明天再试`,
        retryAfter,
      );
    }
  }

  async getPublic(id: string): Promise<NotePublicDto> {
    const record = await this.repo.findById(id);
    if (!record) throw noteNotFound();
    return this.toPublic(record);
  }

  async getFullBySecret(origin: string, secret: string): Promise<NoteFullDto> {
    const record = await this.repo.findBySecret(secret);
    if (!record) throw noteNotFound();
    return this.toFull(origin, record);
  }

  async update(origin: string, secret: string, body: UpdateNoteBody): Promise<NoteFullDto> {
    const record = await this.repo.findBySecret(secret);
    if (!record) throw noteNotFound();

    const hasTitle = Object.prototype.hasOwnProperty.call(body, 'title');
    const hasContent = Object.prototype.hasOwnProperty.call(body, 'content');
    const hasFormat = Object.prototype.hasOwnProperty.call(body, 'format');
    const hasId = Object.prototype.hasOwnProperty.call(body, 'id');
    if (!hasTitle && !hasContent && !hasFormat && !hasId) {
      throw new AppError(
        400,
        ErrorCode.BAD_REQUEST,
        '请求体至少需要包含 title、content、format 或 id 之一',
      );
    }

    const title = hasTitle ? sanitizeTitle(body.title) : record.title;
    const content = hasContent ? optionalContent(body.content) : undefined;
    const format = hasFormat ? optionalFormat(body.format) : undefined;
    const nextId = hasId ? optionalId(body.id) : undefined;

    // 最终将落库的标题/正文都过敏感词（未传 content 时用库内原文）
    this.sensitive?.assertClean(title, content ?? record.content);

    // 分享码未变则不当作更新字段，避免无意义主键写。
    const id =
      nextId !== undefined && nextId !== record.id ? nextId : undefined;
    if (id !== undefined) {
      const occupied = await this.repo.findById(id);
      if (occupied && occupied.secret !== secret) {
        throw validationFailed({ id: '该分享码已被占用，请换一个' }, '分享码冲突');
      }
    }

    let updated: NoteRecord | undefined;
    try {
      updated = await this.repo.updateBySecret(secret, {
        title,
        id,
        content,
        format,
        updatedAt: Date.now(),
      });
    } catch (err) {
      // 并发下主键冲突时转为可读校验错误。
      const msg = err instanceof Error ? err.message : String(err);
      if (/UNIQUE|constraint/i.test(msg)) {
        throw validationFailed({ id: '该分享码已被占用，请换一个' }, '分享码冲突');
      }
      throw err;
    }
    if (!updated) throw noteNotFound();
    this.log?.info(
      id !== undefined ? `update id=${record.id}->${updated.id}` : `update id=${updated.id}`,
    );
    return this.toFull(origin, updated);
  }

  async remove(secret: string): Promise<void> {
    const record = await this.repo.findBySecret(secret);
    if (!record) throw noteNotFound();
    const deleted = await this.repo.deleteBySecret(secret);
    if (!deleted) throw noteNotFound();
    this.log?.info(`delete id=${record.id}`);
  }

  async listForAdmin(options: {
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<AdminNoteListResult> {
    const page = Math.max(1, Math.floor(options.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Math.floor(options.pageSize) || 20));
    const q = options.q?.trim() || undefined;
    const total = await this.repo.count(q);
    const offset = (page - 1) * pageSize;
    const rows = await this.repo.list({ limit: pageSize, offset, q });
    return {
      items: rows.map((r) => this.toAdminListItem(r)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 管理端批量清理：`all` 清空；其余按更新时间只保留最近窗口内的笔记。
   */
  async purgeForAdmin(keep: AdminPurgeKeep): Promise<AdminPurgeResult> {
    const updatedBeforeMs =
      keep === 'all' ? null : Date.now() - PURGE_KEEP_MS[keep];
    const deleted = await this.repo.deleteOlderThan(updatedBeforeMs);
    this.log?.info(
      keep === 'all'
        ? `admin purge all deleted=${deleted}`
        : `admin purge keep=${keep} deleted=${deleted}`,
    );
    return { deleted, keep };
  }

  /** 供 Raw 路由直接取原始内容，不存在抛 404。 */
  async getRawContent(id: string): Promise<{ content: string }> {
    const record = await this.repo.findById(id);
    if (!record) throw noteNotFound();
    return { content: record.content };
  }

  private toAdminListItem(record: NoteRecord): AdminNoteListItem {
    const plain = record.content.replace(/\s+/g, ' ').trim();
    const preview =
      codePointLength(plain) <= PREVIEW_MAX
        ? plain
        : `${[...plain].slice(0, PREVIEW_MAX).join('')}…`;
    return {
      id: record.id,
      secret: record.secret,
      title: record.title,
      format: record.format === 'text' ? 'text' : 'markdown',
      contentPreview: preview,
      contentLength: codePointLength(record.content),
      ip: record.ip,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  private toPublic(record: NoteRecord): NotePublicDto {
    return {
      id: record.id,
      title: record.title,
      content: record.content,
      format: record.format === 'text' ? 'text' : 'markdown',
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  private toFull(origin: string, record: NoteRecord): NoteFullDto {
    return {
      ...this.toPublic(record),
      secret: record.secret,
      editUrl: `${origin}/edit/${record.secret}`,
      noteUrl: `${origin}/note/${record.id}`,
      rawUrl: `${origin}/raw/${record.id}`,
    };
  }
}
