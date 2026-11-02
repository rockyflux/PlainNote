export type NoteFormat = 'text' | 'markdown';

export interface NotePublic {
  id: string;
  title: string | null;
  content: string;
  format: NoteFormat;
  createdAt: number;
  updatedAt: number;
}

export interface NoteFull extends NotePublic {
  secret: string;
  editUrl: string;
  noteUrl: string;
  rawUrl: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

interface ErrorEnvelope {
  error: { code: string; message: string; fields?: Record<string, string> };
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  // 无 body 时不要带 Content-Type: application/json，否则 Fastify 会按空 JSON 体解析并返回 400
  // （浏览器 DELETE 常附带 Content-Length: 0）。
  const headers = new Headers(options.headers);
  if (options.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json; charset=utf-8');
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

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

export interface CreateNotePayload {
  title?: string | null;
  content: string;
  format: NoteFormat;
  timezone?: string | null;
  language?: string | null;
}

export interface UpdateNotePayload {
  title?: string | null;
  content?: string;
  format?: NoteFormat;
  /** 自定义分享码（public id），写入后 note/raw 链接同步变更。 */
  id?: string;
}

export const api = {
  create(body: CreateNotePayload): Promise<NoteFull> {
    return request<NoteFull>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  loadBySecret(secret: string): Promise<NoteFull> {
    return request<NoteFull>(`/api/notes/by-secret/${encodeURIComponent(secret)}`);
  },

  getPublic(id: string): Promise<NotePublic> {
    return request<NotePublic>(`/api/notes/${encodeURIComponent(id)}`);
  },

  update(secret: string, body: UpdateNotePayload): Promise<NoteFull> {
    return request<NoteFull>(`/api/notes/${encodeURIComponent(secret)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  remove(secret: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/notes/${encodeURIComponent(secret)}`, {
      method: 'DELETE',
    });
  },
};
