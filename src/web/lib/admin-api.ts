import { ApiError } from './api';

const STORAGE_KEY = 'plainnote-admin-password';

export interface AdminNoteListItem {
  id: string;
  secret: string;
  title: string | null;
  format: 'text' | 'markdown';
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

interface ErrorEnvelope {
  error: { code: string; message: string; fields?: Record<string, string> };
}

export function getStoredAdminPassword(): string | null {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function storeAdminPassword(password: string): void {
  sessionStorage.setItem(STORAGE_KEY, password);
}

export function clearAdminPassword(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

async function adminRequest<T>(
  url: string,
  password: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${password}`);
  if (options.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json; charset=utf-8');
  }

  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get('content-type') ?? '';
  const body: unknown = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const envelope = body as ErrorEnvelope | null;
    throw new ApiError(
      res.status,
      envelope?.error?.message ?? `请求失败（${res.status}）`,
      envelope?.error?.fields,
    );
  }
  return body as T;
}

/** 管理口令仅用于登录与列表；改删仍用公开 note secret API。 */
export const adminApi = {
  async login(password: string): Promise<void> {
    await adminRequest<{ ok: boolean }>('/api/admin/login', password, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    storeAdminPassword(password);
  },

  list(
    password: string,
    opts: { page: number; pageSize: number; q?: string },
  ): Promise<AdminNoteListResult> {
    const params = new URLSearchParams({
      page: String(opts.page),
      pageSize: String(opts.pageSize),
    });
    if (opts.q?.trim()) params.set('q', opts.q.trim());
    return adminRequest(`/api/admin/notes?${params}`, password);
  },
};
