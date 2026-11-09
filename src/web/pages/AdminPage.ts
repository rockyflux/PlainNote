import { api, ApiError } from '../lib/api';
import {
  adminApi,
  clearAdminPassword,
  getStoredAdminPassword,
  type AdminNoteListItem,
  type AdminPurgeKeep,
} from '../lib/admin-api';
import { copyText, formatTime, toast } from '../lib/dom';
import { openModal } from '../lib/modal';
import { brandBarHtml } from '../components/BrandBar';
import { footerHtml } from '../components/Footer';
import { bindLangSwitch, getLang, t } from '../lib/i18n';

const PAGE_SIZE = 20;

type Copy = {
  title: string;
  loginLead: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  loginBtn: string;
  loggingIn: string;
  loginFailed: string;
  logout: string;
  searchPlaceholder: string;
  searchBtn: string;
  refresh: string;
  batchDelete: string;
  purgeLabel: string;
  purgeAll: string;
  purgeKeep7d: string;
  purgeKeep30d: string;
  purgeKeep90d: string;
  purgeKeep180d: string;
  purgeKeep365d: string;
  purgeBtn: string;
  purgeConfirmTitle: string;
  purgeConfirmBody: (keep: AdminPurgeKeep) => string;
  purgeConfirmBtn: string;
  purging: string;
  purged: (n: number) => string;
  selected: (n: number) => string;
  empty: string;
  colTitle: string;
  colId: string;
  colFormat: string;
  colUpdated: string;
  colIp: string;
  colActions: string;
  view: string;
  edit: string;
  deleteOne: string;
  untitled: string;
  pageInfo: (page: number, totalPages: number, total: number) => string;
  prev: string;
  next: string;
  viewTitle: string;
  editInEditor: string;
  saveInline: string;
  saving: string;
  saved: string;
  copyLinks: string;
  deleteConfirmTitle: string;
  deleteConfirmBody: (n: number) => string;
  deleteConfirmBtn: string;
  deleting: string;
  deleted: (n: number) => string;
  loadFailed: string;
  unauthorized: string;
};

const ZH: Copy = {
  title: '管理后台',
  loginLead: '输入启动时生成的管理口令。登录后本标签页会记住口令，每次请求仍由服务端校验。',
  passwordLabel: '管理口令',
  passwordPlaceholder: '管理口令（ADMIN_PASSWORD 或 admin.password）',
  loginBtn: '登录',
  loggingIn: '登录中…',
  loginFailed: '登录失败',
  logout: '退出登录',
  searchPlaceholder: '搜索 id / secret / 标题 / 正文 / IP',
  searchBtn: '搜索',
  refresh: '刷新',
  batchDelete: '批量删除',
  purgeLabel: '清理',
  purgeAll: '一键清空全部',
  purgeKeep7d: '保留最近一周',
  purgeKeep30d: '保留最近一个月',
  purgeKeep90d: '保留最近三个月',
  purgeKeep180d: '保留最近半年',
  purgeKeep365d: '保留最近一年',
  purgeBtn: '执行清理',
  purgeConfirmTitle: '确认清理',
  purgeConfirmBody: (keep) =>
    keep === 'all'
      ? '将永久删除全部笔记，此操作不可恢复。'
      : `将永久删除超出所选时间范围的笔记（按更新时间），保留最近记录。此操作不可恢复。`,
  purgeConfirmBtn: '确认清理',
  purging: '清理中…',
  purged: (n) => `已清理 ${n} 条`,
  selected: (n) => `已选 ${n} 条`,
  empty: '暂无笔记',
  colTitle: '标题',
  colId: '分享码',
  colFormat: '格式',
  colUpdated: '更新时间',
  colIp: 'IP',
  colActions: '操作',
  view: '查看',
  edit: '编辑',
  deleteOne: '删除',
  untitled: '（无标题）',
  pageInfo: (page, totalPages, total) => `第 ${page} / ${totalPages} 页 · 共 ${total} 条`,
  prev: '上一页',
  next: '下一页',
  viewTitle: '笔记详情',
  editInEditor: '打开编辑页',
  saveInline: '保存修改',
  saving: '保存中…',
  saved: '已保存',
  copyLinks: '复制链接',
  deleteConfirmTitle: '确认删除',
  deleteConfirmBody: (n) => `将永久删除 ${n} 条笔记，此操作不可恢复。`,
  deleteConfirmBtn: '确认删除',
  deleting: '删除中…',
  deleted: (n) => `已删除 ${n} 条`,
  loadFailed: '加载失败',
  unauthorized: '口令无效或已失效，请重新登录',
};

const EN: Copy = {
  title: 'Admin',
  loginLead:
    'Enter the admin password printed at startup. It is remembered in this tab; every request is still verified by the server.',
  passwordLabel: 'Admin password',
  passwordPlaceholder: 'Admin password (ADMIN_PASSWORD or admin.password)',
  loginBtn: 'Sign in',
  loggingIn: 'Signing in…',
  loginFailed: 'Sign-in failed',
  logout: 'Sign out',
  searchPlaceholder: 'Search id / secret / title / body / IP',
  searchBtn: 'Search',
  refresh: 'Refresh',
  batchDelete: 'Delete selected',
  purgeLabel: 'Purge',
  purgeAll: 'Clear all notes',
  purgeKeep7d: 'Keep last week',
  purgeKeep30d: 'Keep last month',
  purgeKeep90d: 'Keep last 3 months',
  purgeKeep180d: 'Keep last 6 months',
  purgeKeep365d: 'Keep last year',
  purgeBtn: 'Run purge',
  purgeConfirmTitle: 'Confirm purge',
  purgeConfirmBody: (keep) =>
    keep === 'all'
      ? 'Permanently delete every note. This cannot be undone.'
      : 'Permanently delete notes older than the selected window (by update time). This cannot be undone.',
  purgeConfirmBtn: 'Purge',
  purging: 'Purging…',
  purged: (n) => `Purged ${n}`,
  selected: (n) => `${n} selected`,
  empty: 'No notes yet',
  colTitle: 'Title',
  colId: 'Share id',
  colFormat: 'Format',
  colUpdated: 'Updated',
  colIp: 'IP',
  colActions: 'Actions',
  view: 'View',
  edit: 'Edit',
  deleteOne: 'Delete',
  untitled: '(untitled)',
  pageInfo: (page, totalPages, total) => `Page ${page} / ${totalPages} · ${total} total`,
  prev: 'Prev',
  next: 'Next',
  viewTitle: 'Note detail',
  editInEditor: 'Open editor',
  saveInline: 'Save',
  saving: 'Saving…',
  saved: 'Saved',
  copyLinks: 'Copy links',
  deleteConfirmTitle: 'Confirm delete',
  deleteConfirmBody: (n) => `Permanently delete ${n} note(s). This cannot be undone.`,
  deleteConfirmBtn: 'Delete',
  deleting: 'Deleting…',
  deleted: (n) => `Deleted ${n}`,
  loadFailed: 'Failed to load',
  unauthorized: 'Invalid password. Please sign in again.',
};

function copy(): Copy {
  return getLang() === 'en' ? EN : ZH;
}

const PURGE_OPTIONS: AdminPurgeKeep[] = ['30d', '7d', '90d', '180d', '365d', 'all'];
const DEFAULT_PURGE_KEEP: AdminPurgeKeep = '30d';

function purgeOptionLabel(c: Copy, keep: AdminPurgeKeep): string {
  switch (keep) {
    case 'all':
      return c.purgeAll;
    case '7d':
      return c.purgeKeep7d;
    case '30d':
      return c.purgeKeep30d;
    case '90d':
      return c.purgeKeep90d;
    case '180d':
      return c.purgeKeep180d;
    case '365d':
      return c.purgeKeep365d;
  }
}

function parsePurgeKeep(raw: string): AdminPurgeKeep | null {
  return (PURGE_OPTIONS as string[]).includes(raw) ? (raw as AdminPurgeKeep) : null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function mountAdmin(root: HTMLElement): void {
  const password = getStoredAdminPassword();
  if (password) {
    void renderDashboard(root, password);
  } else {
    renderLogin(root);
  }
}

function goHome(): void {
  window.history.pushState({}, '', '/');
  window.dispatchEvent(new Event('popstate'));
}

function bindBrandBar(root: HTMLElement, onLangChange: () => void): void {
  bindLangSwitch(root, onLangChange);
  root.querySelector<HTMLButtonElement>('#new-note')?.addEventListener('click', goHome);
}

function renderLogin(root: HTMLElement): void {
  const c = copy();
  root.innerHTML = `
    <div class="wrap admin-wrap">
      ${brandBarHtml()}
      <section class="admin-login" aria-label="${escapeHtml(c.title)}">
        <h1 class="admin-title">${escapeHtml(c.title)}</h1>
        <p class="admin-lead">${escapeHtml(c.loginLead)}</p>
        <form id="admin-login-form" class="admin-login-form">
          <label class="admin-field">
            <span>${escapeHtml(c.passwordLabel)}</span>
            <input
              id="admin-password"
              type="password"
              autocomplete="current-password"
              placeholder="${escapeHtml(c.passwordPlaceholder)}"
              required
            />
          </label>
          <p id="admin-login-error" class="admin-error" hidden></p>
          <button type="submit" class="btn-primary" id="admin-login-btn">${escapeHtml(c.loginBtn)}</button>
        </form>
      </section>
    </div>
    ${footerHtml()}
  `;
  bindBrandBar(root, () => renderLogin(root));

  const form = root.querySelector<HTMLFormElement>('#admin-login-form')!;
  const input = root.querySelector<HTMLInputElement>('#admin-password')!;
  const errEl = root.querySelector<HTMLElement>('#admin-login-error')!;
  const btn = root.querySelector<HTMLButtonElement>('#admin-login-btn')!;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = input.value.trim();
    if (!password) return;
    btn.disabled = true;
    btn.textContent = c.loggingIn;
    errEl.hidden = true;
    try {
      await adminApi.login(password);
      await renderDashboard(root, password);
    } catch (err) {
      errEl.hidden = false;
      errEl.textContent =
        err instanceof ApiError ? err.message : c.loginFailed;
      btn.disabled = false;
      btn.textContent = c.loginBtn;
    }
  });

  input.focus();
}

interface DashState {
  password: string;
  page: number;
  q: string;
  items: AdminNoteListItem[];
  total: number;
  selected: Set<string>;
  loading: boolean;
}

async function renderDashboard(root: HTMLElement, password: string, init?: Partial<DashState>): Promise<void> {
  const state: DashState = {
    password,
    page: init?.page ?? 1,
    q: init?.q ?? '',
    items: [],
    total: 0,
    selected: new Set(),
    loading: true,
  };

  const paint = () => paintDashboard(root, state, {
    onSearch: (q) => {
      void renderDashboard(root, password, { page: 1, q });
    },
    onPage: (page) => {
      void renderDashboard(root, password, { page, q: state.q });
    },
    onRefresh: () => {
      void renderDashboard(root, password, { page: state.page, q: state.q });
    },
    onLogout: () => {
      clearAdminPassword();
      renderLogin(root);
    },
    onToggle: (secret, checked) => {
      if (checked) state.selected.add(secret);
      else state.selected.delete(secret);
      updateSelectionUi(root, state);
    },
    onToggleAll: (checked) => {
      state.selected.clear();
      if (checked) {
        for (const item of state.items) state.selected.add(item.secret);
      }
      updateSelectionUi(root, state);
      root.querySelectorAll<HTMLInputElement>('.admin-row-check').forEach((el) => {
        el.checked = checked;
      });
    },
    onView: (secret) => {
      void openViewModal(root, state, secret);
    },
    onDelete: (secrets) => {
      confirmDelete(root, state, secrets);
    },
    onPurge: (keep) => {
      confirmPurge(root, state, keep);
    },
  });

  paint();

  try {
    const result = await adminApi.list(password, {
      page: state.page,
      pageSize: PAGE_SIZE,
      q: state.q || undefined,
    });
    state.items = result.items;
    state.total = result.total;
    state.page = result.page;
    state.loading = false;
    paint();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      clearAdminPassword();
      toast(copy().unauthorized);
      renderLogin(root);
      return;
    }
    state.loading = false;
    paint();
    toast(err instanceof ApiError ? err.message : copy().loadFailed);
  }
}

function paintDashboard(
  root: HTMLElement,
  state: DashState,
  handlers: {
    onSearch: (q: string) => void;
    onPage: (page: number) => void;
    onRefresh: () => void;
    onLogout: () => void;
    onToggle: (secret: string, checked: boolean) => void;
    onToggleAll: (checked: boolean) => void;
    onView: (secret: string) => void;
    onDelete: (secrets: string[]) => void;
    onPurge: (keep: AdminPurgeKeep) => void;
  },
): void {
  const c = copy();
  const totalPages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
  const purgeOptions = PURGE_OPTIONS.map(
    (keep) =>
      `<option value="${keep}"${keep === DEFAULT_PURGE_KEEP ? ' selected' : ''}>${escapeHtml(purgeOptionLabel(c, keep))}</option>`,
  ).join('');
  const rows = state.items
    .map((item) => {
      const title = item.title?.trim() || c.untitled;
      const checked = state.selected.has(item.secret);
      return `
        <tr data-secret="${escapeHtml(item.secret)}">
          <td class="admin-check-col">
            <input type="checkbox" class="admin-row-check" ${checked ? 'checked' : ''} aria-label="${escapeHtml(title)}" />
          </td>
          <td>
            <div class="admin-title-cell">${escapeHtml(title)}</div>
            <div class="admin-preview">${escapeHtml(item.contentPreview || '')}</div>
          </td>
          <td><code>${escapeHtml(item.id)}</code></td>
          <td>${escapeHtml(item.format)}</td>
          <td class="admin-mono">${escapeHtml(formatTime(item.updatedAt))}</td>
          <td class="admin-mono">${escapeHtml(item.ip ?? '—')}</td>
          <td class="admin-actions-cell">
            <button type="button" class="btn-ghost admin-act-view">${escapeHtml(c.view)}</button>
            <a class="btn-ghost admin-link-btn" href="/edit/${encodeURIComponent(item.secret)}">${escapeHtml(c.edit)}</a>
            <button type="button" class="btn-danger admin-act-del">${escapeHtml(c.deleteOne)}</button>
          </td>
        </tr>
      `;
    })
    .join('');

  root.innerHTML = `
    <div class="wrap admin-wrap">
      ${brandBarHtml()}
      <section class="admin-panel" aria-label="${escapeHtml(c.title)}">
        <div class="admin-toolbar">
          <h1 class="admin-title">${escapeHtml(c.title)}</h1>
          <button type="button" class="btn-ghost" id="admin-logout">${escapeHtml(c.logout)}</button>
        </div>
        <div class="admin-filters">
          <form id="admin-search-form" class="admin-search-form">
            <input
              id="admin-search"
              type="search"
              value="${escapeHtml(state.q)}"
              placeholder="${escapeHtml(c.searchPlaceholder)}"
            />
            <button type="submit" class="btn-primary">${escapeHtml(c.searchBtn)}</button>
          </form>
          <div class="admin-filter-actions">
            <button type="button" class="btn-ghost" id="admin-refresh">${escapeHtml(c.refresh)}</button>
            <label class="admin-purge">
              <span class="admin-purge-label">${escapeHtml(c.purgeLabel)}</span>
              <select id="admin-purge-keep" aria-label="${escapeHtml(c.purgeLabel)}">
                ${purgeOptions}
              </select>
              <button type="button" class="btn-danger" id="admin-purge">${escapeHtml(c.purgeBtn)}</button>
            </label>
            <span class="admin-selected" id="admin-selected">${escapeHtml(c.selected(state.selected.size))}</span>
            <button type="button" class="btn-danger" id="admin-batch-del" ${state.selected.size === 0 ? 'disabled' : ''}>
              ${escapeHtml(c.batchDelete)}
            </button>
          </div>
        </div>
        <div class="admin-table-wrap" aria-busy="${state.loading ? 'true' : 'false'}">
          ${
            state.loading
              ? `<p class="admin-empty">${escapeHtml(t().loading)}</p>`
              : state.items.length === 0
                ? `<p class="admin-empty">${escapeHtml(c.empty)}</p>`
                : `
            <table class="admin-table">
              <thead>
                <tr>
                  <th class="admin-check-col">
                    <input type="checkbox" id="admin-check-all" aria-label="select all" />
                  </th>
                  <th>${escapeHtml(c.colTitle)}</th>
                  <th>${escapeHtml(c.colId)}</th>
                  <th>${escapeHtml(c.colFormat)}</th>
                  <th>${escapeHtml(c.colUpdated)}</th>
                  <th>${escapeHtml(c.colIp)}</th>
                  <th>${escapeHtml(c.colActions)}</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          `
          }
        </div>
        <div class="admin-pager">
          <span class="admin-page-info">${escapeHtml(c.pageInfo(state.page, totalPages, state.total))}</span>
          <div class="admin-pager-btns">
            <button type="button" class="btn-ghost" id="admin-prev" ${state.page <= 1 ? 'disabled' : ''}>${escapeHtml(c.prev)}</button>
            <button type="button" class="btn-ghost" id="admin-next" ${state.page >= totalPages ? 'disabled' : ''}>${escapeHtml(c.next)}</button>
          </div>
        </div>
      </section>
    </div>
    ${footerHtml()}
  `;

  bindBrandBar(root, () => {
    void renderDashboard(root, state.password, { page: state.page, q: state.q });
  });

  root.querySelector('#admin-logout')?.addEventListener('click', handlers.onLogout);
  root.querySelector('#admin-refresh')?.addEventListener('click', handlers.onRefresh);
  root.querySelector('#admin-prev')?.addEventListener('click', () => handlers.onPage(state.page - 1));
  root.querySelector('#admin-next')?.addEventListener('click', () => handlers.onPage(state.page + 1));

  root.querySelector('#admin-search-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = root.querySelector<HTMLInputElement>('#admin-search')?.value ?? '';
    handlers.onSearch(q);
  });

  root.querySelector('#admin-check-all')?.addEventListener('change', (e) => {
    handlers.onToggleAll((e.target as HTMLInputElement).checked);
  });

  root.querySelector('#admin-batch-del')?.addEventListener('click', () => {
    handlers.onDelete([...state.selected]);
  });

  root.querySelector('#admin-purge')?.addEventListener('click', () => {
    const raw = root.querySelector<HTMLSelectElement>('#admin-purge-keep')?.value ?? '';
    const keep = parsePurgeKeep(raw);
    if (keep) handlers.onPurge(keep);
  });

  root.querySelectorAll<HTMLTableRowElement>('tr[data-secret]').forEach((tr) => {
    const secret = tr.dataset.secret!;
    tr.querySelector('.admin-row-check')?.addEventListener('change', (e) => {
      handlers.onToggle(secret, (e.target as HTMLInputElement).checked);
    });
    tr.querySelector('.admin-act-view')?.addEventListener('click', () => handlers.onView(secret));
    tr.querySelector('.admin-act-del')?.addEventListener('click', () => handlers.onDelete([secret]));
  });
}

function updateSelectionUi(root: HTMLElement, state: DashState): void {
  const c = copy();
  const selectedEl = root.querySelector('#admin-selected');
  if (selectedEl) selectedEl.textContent = c.selected(state.selected.size);
  const batchBtn = root.querySelector<HTMLButtonElement>('#admin-batch-del');
  if (batchBtn) batchBtn.disabled = state.selected.size === 0;
  const all = root.querySelector<HTMLInputElement>('#admin-check-all');
  if (all) {
    const n = state.items.length;
    all.checked = n > 0 && state.selected.size === n;
    all.indeterminate = state.selected.size > 0 && state.selected.size < n;
  }
}

function confirmDelete(root: HTMLElement, state: DashState, secrets: string[]): void {
  if (secrets.length === 0) return;
  const c = copy();
  const modal = openModal({
    title: c.deleteConfirmTitle,
    bodyHtml: `<p>${escapeHtml(c.deleteConfirmBody(secrets.length))}</p>`,
    actionsHtml: `
      <button type="button" class="btn-ghost" data-act="cancel">${escapeHtml(t().cancel)}</button>
      <button type="button" class="btn-danger" data-act="ok">${escapeHtml(c.deleteConfirmBtn)}</button>
    `,
    closeLabel: t().close,
  });

  modal.dialog.querySelector('[data-act="cancel"]')?.addEventListener('click', () => modal.close());
  modal.dialog.querySelector('[data-act="ok"]')?.addEventListener('click', async () => {
    const okBtn = modal.dialog.querySelector<HTMLButtonElement>('[data-act="ok"]')!;
    okBtn.disabled = true;
    okBtn.textContent = c.deleting;
    try {
      let deleted = 0;
      for (const secret of secrets) {
        try {
          await api.remove(secret);
          deleted += 1;
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 404)) throw err;
        }
      }
      modal.close();
      toast(c.deleted(deleted));
      await renderDashboard(root, state.password, { page: state.page, q: state.q });
    } catch (err) {
      okBtn.disabled = false;
      okBtn.textContent = c.deleteConfirmBtn;
      toast(err instanceof ApiError ? err.message : c.loadFailed);
    }
  });
}

function confirmPurge(root: HTMLElement, state: DashState, keep: AdminPurgeKeep): void {
  const c = copy();
  const modal = openModal({
    title: c.purgeConfirmTitle,
    bodyHtml: `
      <p>${escapeHtml(c.purgeConfirmBody(keep))}</p>
      <p class="admin-purge-summary">${escapeHtml(purgeOptionLabel(c, keep))}</p>
    `,
    actionsHtml: `
      <button type="button" class="btn-ghost" data-act="cancel">${escapeHtml(t().cancel)}</button>
      <button type="button" class="btn-danger" data-act="ok">${escapeHtml(c.purgeConfirmBtn)}</button>
    `,
    closeLabel: t().close,
  });

  modal.dialog.querySelector('[data-act="cancel"]')?.addEventListener('click', () => modal.close());
  modal.dialog.querySelector('[data-act="ok"]')?.addEventListener('click', async () => {
    const okBtn = modal.dialog.querySelector<HTMLButtonElement>('[data-act="ok"]')!;
    okBtn.disabled = true;
    okBtn.textContent = c.purging;
    try {
      const result = await adminApi.purge(state.password, keep);
      modal.close();
      toast(c.purged(result.deleted));
      await renderDashboard(root, state.password, { page: 1, q: state.q });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        modal.close();
        clearAdminPassword();
        toast(c.unauthorized);
        renderLogin(root);
        return;
      }
      okBtn.disabled = false;
      okBtn.textContent = c.purgeConfirmBtn;
      toast(err instanceof ApiError ? err.message : c.loadFailed);
    }
  });
}

async function openViewModal(root: HTMLElement, state: DashState, secret: string): Promise<void> {
  const c = copy();
  try {
    const note = await api.loadBySecret(secret);
    const modal = openModal({
      title: c.viewTitle,
      bodyHtml: `
        <div class="admin-detail">
          <label class="admin-field">
            <span>${escapeHtml(c.colTitle)}</span>
            <input id="admin-edit-title" type="text" value="${escapeHtml(note.title ?? '')}" maxlength="200" />
          </label>
          <label class="admin-field">
            <span>${escapeHtml(c.colId)}</span>
            <input id="admin-edit-id" type="text" value="${escapeHtml(note.id)}" />
          </label>
          <label class="admin-field">
            <span>${escapeHtml(c.colFormat)}</span>
            <select id="admin-edit-format">
              <option value="text" ${note.format === 'text' ? 'selected' : ''}>text</option>
              <option value="markdown" ${note.format === 'markdown' ? 'selected' : ''}>markdown</option>
            </select>
          </label>
          <label class="admin-field">
            <span>${escapeHtml(t().contentLabel)}</span>
            <textarea id="admin-edit-content" rows="12">${escapeHtml(note.content)}</textarea>
          </label>
          <div class="admin-detail-meta admin-mono">
            <div>created: ${escapeHtml(formatTime(note.createdAt))}</div>
            <div>updated: ${escapeHtml(formatTime(note.updatedAt))}</div>
            <div>edit: ${escapeHtml(note.editUrl)}</div>
            <div>note: ${escapeHtml(note.noteUrl)}</div>
            <div>raw: ${escapeHtml(note.rawUrl)}</div>
          </div>
        </div>
      `,
      actionsHtml: `
        <button type="button" class="btn-ghost" data-act="copy">${escapeHtml(c.copyLinks)}</button>
        <a class="btn-ghost admin-link-btn" href="/edit/${encodeURIComponent(note.secret)}" data-act="editor">${escapeHtml(c.editInEditor)}</a>
        <button type="button" class="btn-primary" data-act="save">${escapeHtml(c.saveInline)}</button>
      `,
      closeLabel: t().close,
    });
    modal.dialog.classList.add('modal-wide');

    modal.dialog.querySelector('[data-act="copy"]')?.addEventListener('click', async () => {
      const text = `edit: ${note.editUrl}\nnote: ${note.noteUrl}\nraw: ${note.rawUrl}`;
      const ok = await copyText(text);
      toast(ok ? t().copiedToast : t().copyFailed);
    });

    modal.dialog.querySelector('[data-act="save"]')?.addEventListener('click', async () => {
      const saveBtn = modal.dialog.querySelector<HTMLButtonElement>('[data-act="save"]')!;
      const title = modal.dialog.querySelector<HTMLInputElement>('#admin-edit-title')!.value;
      const id = modal.dialog.querySelector<HTMLInputElement>('#admin-edit-id')!.value.trim();
      const format = modal.dialog.querySelector<HTMLSelectElement>('#admin-edit-format')!.value as
        | 'text'
        | 'markdown';
      const content = modal.dialog.querySelector<HTMLTextAreaElement>('#admin-edit-content')!.value;
      saveBtn.disabled = true;
      saveBtn.textContent = c.saving;
      try {
        await api.update(secret, {
          title: title.trim() || null,
          id,
          format,
          content,
        });
        toast(c.saved);
        modal.close();
        await renderDashboard(root, state.password, { page: state.page, q: state.q });
      } catch (err) {
        saveBtn.disabled = false;
        saveBtn.textContent = c.saveInline;
        toast(err instanceof ApiError ? err.message : c.loadFailed);
      }
    });
  } catch (err) {
    toast(err instanceof ApiError ? err.message : c.loadFailed);
  }
}
