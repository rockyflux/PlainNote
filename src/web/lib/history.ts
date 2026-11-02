/** 本机笔记历史：仅存浏览器 localStorage，不做服务端列表。 */

export interface HistoryItem {
  id: string;
  secret: string;
  title: string | null;
  createdAt: number;
  /** 写入本机历史的时间（创建或再次打开时刷新） */
  savedAt: number;
}

const STORAGE_KEY = 'plainnote-history';
const MAX_ITEMS = 10;

function isHistoryItem(value: unknown): value is HistoryItem {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.secret === 'string' &&
    (v.title === null || typeof v.title === 'string') &&
    typeof v.createdAt === 'number' &&
    typeof v.savedAt === 'number'
  );
}

export function listHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryItem).sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

function writeAll(items: HistoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // 配额满或隐私模式禁用存储时静默失败，不影响主流程。
  }
}

/** 按 id 去重后置顶；超出上限丢弃最旧项。 */
export function upsertHistory(item: Omit<HistoryItem, 'savedAt'> & { savedAt?: number }): void {
  const next: HistoryItem = {
    id: item.id,
    secret: item.secret,
    title: item.title,
    createdAt: item.createdAt,
    savedAt: item.savedAt ?? Date.now(),
  };
  // 按 id 与 secret 双重去重：改分享码后避免遗留旧 id 条目。
  const rest = listHistory().filter((h) => h.id !== next.id && h.secret !== next.secret);
  writeAll([next, ...rest]);
}

export function removeHistory(id: string): void {
  writeAll(listHistory().filter((h) => h.id !== id));
}
