import { api, ApiError, type NoteFormat, type NoteFull } from '../lib/api';
import { renderMarkdown } from '../lib/markdown';
import { codeLength, copyText, toast, downloadNote } from '../lib/dom';
import { removeHistory, upsertHistory } from '../lib/history';
import { openModal } from '../lib/modal';
import { brandBarHtml } from '../components/BrandBar';
import { footerHtml } from '../components/Footer';
import { renderErrorView } from '../components/ErrorView';
import { bindLangSwitch, t } from '../lib/i18n';

const MAX_CONTENT = 30_000;
const MAX_TITLE = 200;
const MIN_SHARE_ID = 6;
const MAX_SHARE_ID = 48;
const SHARE_ID_PATTERN = /^[A-Za-z0-9-]+$/;
const EDIT_WARN_KEY = 'plainnote-edit-warn-seen';

function skeletonHtml(): string {
  const m = t();
  return `
    <div class="wrap" aria-busy="true" aria-live="polite">
      ${brandBarHtml({ newBtnDisabled: true })}
      <div class="skeleton-block skeleton-title" style="margin-bottom:16px;"></div>
      <div class="snippet-window">
        <div class="snippet-chrome">
          <div class="snippet-dots" aria-hidden="true">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
        </div>
        <div class="snippet-body">
          <div class="skeleton-block skeleton-pane" style="min-height:360px;border:none;border-radius:0;"></div>
        </div>
      </div>
      <p class="preview-empty" style="margin-top:12px;">${escapeHtml(m.loading)}</p>
    </div>
    ${footerHtml()}
  `;
}

function lineCount(text: string): number {
  if (text.length === 0) return 1;
  return text.split('\n').length;
}

export function mountEdit(root: HTMLElement, secret: string): void {
  const load = () => {
    root.innerHTML = skeletonHtml();
    api
      .loadBySecret(secret)
      .then((note) => {
        upsertHistory({
          id: note.id,
          secret: note.secret,
          title: note.title,
          createdAt: note.createdAt,
        });
        renderEditor(root, note);
      })
      .catch((err: unknown) => {
        const m = t();
        if (err instanceof ApiError && err.status === 404) {
          renderErrorView(root, {
            kind: 'not_found',
            message: m.editNotFound,
          });
        } else {
          renderErrorView(root, {
            kind: 'load_failed',
            message: m.loadFailed,
            onRetry: load,
          });
        }
      });
  };

  load();
}

type EditorState = {
  dirty: boolean;
  format: NoteFormat;
  title: string;
  content: string;
};

function renderEditor(root: HTMLElement, note: NoteFull, state?: Partial<EditorState>): void {
  const m = t();
  const showWarn = !sessionStorage.getItem(EDIT_WARN_KEY);
  let format: NoteFormat =
    state?.format ?? (note.format === 'text' ? 'text' : 'markdown');
  const initialTitle = state?.title ?? note.title ?? '';
  const initialContent = state?.content ?? note.content;

  const pageTitle = note.title?.trim() || m.editDefaultTitle;
  document.title = `${pageTitle} · PlainNote`;

  root.innerHTML = `
    <div class="wrap">
      ${brandBarHtml()}
      ${
        showWarn
          ? `<div class="result-warning edit-warn" role="status">
              ${escapeHtml(m.editWarn)}
              <button type="button" class="btn-ghost edit-warn-dismiss" aria-label="${escapeAttr(m.editWarnDismissAria)}">${escapeHtml(m.editWarnDismiss)}</button>
            </div>`
          : ''
      }
      <input id="title" class="title-input" maxlength="${MAX_TITLE}" value="${escapeAttr(initialTitle)}" placeholder="${escapeAttr(m.titlePlaceholder)}" />
      <div class="snippet-window" id="snippet">
        <div class="snippet-chrome">
          <div class="snippet-chrome-left">
            <div class="snippet-dots" aria-hidden="true">
              <span class="dot red"></span>
              <span class="dot yellow"></span>
              <span class="dot green"></span>
            </div>
            <button type="button" class="share-id-chip" id="share-id-btn" title="${escapeAttr(m.shareIdModalTitle)}" aria-label="${escapeAttr(m.shareIdEditTitle(note.id))}">
              <span class="share-id-chip-text" id="share-id-label">${escapeHtml(note.id)}</span>
              <span class="share-id-chip-icon" aria-hidden="true">${PENCIL_ICON}</span>
            </button>
          </div>
          <div class="mode-switch" role="group" aria-label="${escapeAttr(m.modeLabel)}">
            <button type="button" class="mode-switch-btn" data-mode="text" aria-pressed="false">Text</button>
            <button type="button" class="mode-switch-btn" data-mode="markdown" aria-pressed="false">Markdown</button>
          </div>
        </div>
        <div class="snippet-body" id="snippet-body">
          <textarea
            id="content"
            class="snippet-textarea"
            spellcheck="false"
            aria-label="${escapeAttr(m.contentLabel)}"
          >${escapeHtml(initialContent)}</textarea>
          <div id="preview" class="snippet-preview" hidden>
            <span class="preview-empty">${escapeHtml(m.previewEmpty)}</span>
          </div>
        </div>
        <div class="snippet-status">
          <div class="snippet-meter">
            <div class="snippet-meter-track" aria-hidden="true">
              <div id="meter-fill" class="snippet-meter-fill"></div>
            </div>
            <span id="counter">0 / ${MAX_CONTENT.toLocaleString('en-US')}</span>
          </div>
          <span id="lines">${escapeHtml(m.linesOne)}</span>
        </div>
      </div>
      <div class="action-bar">
        <span class="hotkey-hint">${escapeHtml(m.hotkeyHint)}</span>
        <div class="action-right">
          <button id="copy-note" class="btn-ghost" type="button">${escapeHtml(m.copyNoteLink)}</button>
          <button id="copy-raw" class="btn-ghost" type="button">${escapeHtml(m.copyRawLink)}</button>
          <button id="download" class="btn-ghost" type="button">${escapeHtml(m.download)}</button>
          <button id="delete" class="btn-danger" type="button">${escapeHtml(m.deleteNote)}</button>
          <button id="save" class="btn-primary" type="button">${escapeHtml(m.saveChanges)}</button>
        </div>
      </div>
      <div id="error" class="error-inline" role="alert"></div>
    </div>
    ${footerHtml()}
  `;

  root.querySelector('.edit-warn-dismiss')?.addEventListener('click', () => {
    sessionStorage.setItem(EDIT_WARN_KEY, '1');
    root.querySelector('.edit-warn')?.remove();
  });

  const titleEl = root.querySelector<HTMLInputElement>('#title')!;
  const shareIdBtn = root.querySelector<HTMLButtonElement>('#share-id-btn')!;
  const shareIdLabel = root.querySelector<HTMLElement>('#share-id-label')!;
  const bodyEl = root.querySelector<HTMLElement>('#snippet-body')!;
  const contentEl = root.querySelector<HTMLTextAreaElement>('#content')!;
  const previewEl = root.querySelector<HTMLElement>('#preview')!;
  const counterEl = root.querySelector<HTMLElement>('#counter')!;
  const linesEl = root.querySelector<HTMLElement>('#lines')!;
  const meterFill = root.querySelector<HTMLElement>('#meter-fill')!;
  const saveBtn = root.querySelector<HTMLButtonElement>('#save')!;
  const downloadBtn = root.querySelector<HTMLButtonElement>('#download')!;
  const errorEl = root.querySelector<HTMLElement>('#error')!;
  const modeBtns = root.querySelectorAll<HTMLButtonElement>('.mode-switch-btn');

  let dirty = Boolean(state?.dirty);
  let previewTimer: number | undefined;

  const snapshotState = (): EditorState => ({
    dirty,
    format,
    title: titleEl.value,
    content: contentEl.value,
  });

  bindLangSwitch(root, () => {
    renderEditor(root, note, snapshotState());
  });

  root.querySelector<HTMLButtonElement>('#new-note')!.addEventListener('click', () => {
    if (dirty && !window.confirm(t().leaveUnsavedConfirm)) return;
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new Event('popstate'));
  });

  const setShareIdUi = (id: string) => {
    shareIdLabel.textContent = id;
    shareIdBtn.setAttribute('aria-label', t().shareIdEditTitle(id));
  };

  const refreshPreview = () => {
    if (format !== 'markdown') return;
    previewEl.innerHTML = contentEl.value.trim()
      ? renderMarkdown(contentEl.value)
      : `<span class="preview-empty">${escapeHtml(t().previewEmpty)}</span>`;
  };

  const applyFormatUi = () => {
    const msgs = t();
    const isMd = format === 'markdown';
    modeBtns.forEach((btn) => {
      const active = btn.dataset.mode === format;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    bodyEl.classList.toggle('is-split', isMd);
    previewEl.hidden = !isMd;
    downloadBtn.textContent = isMd ? msgs.downloadMd : msgs.downloadTxt;
    if (isMd) refreshPreview();
  };

  const refreshCounter = () => {
    const msgs = t();
    const text = contentEl.value;
    const len = codeLength(text);
    const over = len > MAX_CONTENT;
    const empty = text.trim().length === 0;
    const ratio = Math.min(1, len / MAX_CONTENT);
    counterEl.textContent = `${len.toLocaleString('en-US')} / ${MAX_CONTENT.toLocaleString('en-US')}`;
    counterEl.style.color = over ? 'var(--danger)' : '';
    meterFill.style.width = `${ratio * 100}%`;
    meterFill.classList.toggle('is-over', over);
    const n = lineCount(text);
    linesEl.textContent = n === 1 ? msgs.linesOne : msgs.linesMany(n);
    saveBtn.disabled = !dirty || over || empty;
  };

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next: NoteFormat = btn.dataset.mode === 'markdown' ? 'markdown' : 'text';
      if (next === format) return;
      format = next;
      dirty = true;
      applyFormatUi();
      refreshCounter();
    });
  });

  contentEl.addEventListener('input', () => {
    dirty = true;
    refreshCounter();
    if (format !== 'markdown') return;
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(refreshPreview, 200);
  });
  titleEl.addEventListener('input', () => {
    dirty = true;
    refreshCounter();
  });

  shareIdBtn.addEventListener('click', () => {
    openShareIdEditor({
      currentId: note.id,
      onSaved: (updated) => {
        note = updated;
        setShareIdUi(updated.id);
        upsertHistory({
          id: updated.id,
          secret: updated.secret,
          title: updated.title,
          createdAt: updated.createdAt,
        });
        toast(t().shareIdUpdatedToast);
      },
      getSecret: () => secretOf(note),
      onFocusBack: () => shareIdBtn.focus(),
    });
  });

  const save = async () => {
    const msgs = t();
    errorEl.textContent = '';
    if (!contentEl.value.trim()) {
      errorEl.textContent = msgs.emptyContent;
      return;
    }
    if (codeLength(contentEl.value) > MAX_CONTENT) {
      errorEl.textContent = msgs.overLimit(MAX_CONTENT);
      return;
    }
    saveBtn.disabled = true;
    saveBtn.textContent = msgs.saving;
    try {
      const updated = await api.update(secretOf(note), {
        title: titleEl.value || null,
        content: contentEl.value,
        format,
      });
      note = updated;
      format = updated.format === 'text' ? 'text' : 'markdown';
      setShareIdUi(updated.id);
      dirty = false;
      upsertHistory({
        id: updated.id,
        secret: updated.secret,
        title: updated.title,
        createdAt: updated.createdAt,
      });
      applyFormatUi();
      toast(t().savedToast);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        errorEl.textContent = t().editLinkInvalid;
        showSaveAsNew(root, titleEl, contentEl, format);
      } else {
        errorEl.textContent = err instanceof ApiError ? err.message : t().saveFailed;
      }
    } finally {
      saveBtn.textContent = t().saveChanges;
      refreshCounter();
    }
  };

  saveBtn.addEventListener('click', () => void save());
  contentEl.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void save();
    }
  });

  root.querySelector<HTMLButtonElement>('#copy-note')!.addEventListener('click', async () => {
    const msgs = t();
    (await copyText(note.noteUrl)) ? toast(msgs.copiedNoteLinkToast) : toast(msgs.copyFailed);
  });
  root.querySelector<HTMLButtonElement>('#copy-raw')!.addEventListener('click', async () => {
    const msgs = t();
    (await copyText(note.rawUrl)) ? toast(msgs.copiedRawLinkToast) : toast(msgs.copyFailed);
  });
  downloadBtn.addEventListener('click', () => {
    downloadNote(titleEl.value || note.title, contentEl.value, format);
  });

  root.querySelector<HTMLButtonElement>('#delete')!.addEventListener('click', () => {
    confirmDelete(root, note);
  });

  applyFormatUi();
  refreshCounter();
  if (!dirty) saveBtn.disabled = true;
}

function confirmDelete(root: HTMLElement, note: NoteFull): void {
  const m = t();
  const trigger = root.querySelector<HTMLButtonElement>('#delete');
  const modal = openModal({
    title: m.deleteConfirmTitle,
    closeLabel: m.close,
    bodyHtml: `<p>${escapeHtml(m.deleteConfirmBody)}</p>`,
    actionsHtml: `
      <button type="button" id="cancel" class="btn-ghost">${escapeHtml(m.cancel)}</button>
      <button type="button" id="confirm" class="btn-danger">${escapeHtml(m.deleteConfirmBtn)}</button>
    `,
    initialFocus: '#cancel',
    onClose: () => {
      trigger?.focus();
    },
  });

  modal.dialog.querySelector('#cancel')!.addEventListener('click', () => modal.close());

  modal.dialog.querySelector<HTMLButtonElement>('#confirm')!.addEventListener('click', async () => {
    const btn = modal.dialog.querySelector<HTMLButtonElement>('#confirm')!;
    btn.disabled = true;
    btn.textContent = t().deleting;
    try {
      await api.remove(note.secret);
      removeHistory(note.id);
      toast(t().deletedToast);
      modal.close();
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new Event('popstate'));
    } catch {
      toast(t().deleteFailed);
      btn.disabled = false;
      btn.textContent = t().deleteConfirmBtn;
    }
  });
}

const secretOf = (note: NoteFull) => note.secret;

const PENCIL_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;

function validateShareId(id: string): string | null {
  const m = t();
  if (!id) return m.shareIdEmpty;
  const len = codeLength(id);
  if (len < MIN_SHARE_ID || len > MAX_SHARE_ID) {
    return m.shareIdLen(MIN_SHARE_ID, MAX_SHARE_ID);
  }
  if (!SHARE_ID_PATTERN.test(id)) {
    return m.shareIdCharset;
  }
  return null;
}

function openShareIdEditor(opts: {
  currentId: string;
  getSecret: () => string;
  onSaved: (note: NoteFull) => void;
  onFocusBack: () => void;
}): void {
  const m = t();
  const modal = openModal({
    title: m.shareIdModalTitle,
    closeLabel: m.close,
    bodyHtml: `
      <p class="share-id-modal-desc">
        ${m.shareIdModalDesc(MIN_SHARE_ID, MAX_SHARE_ID)}
      </p>
      <label class="share-id-modal-label" for="share-id-input">${escapeHtml(m.shareIdModalLabel)}</label>
      <input
        id="share-id-input"
        class="share-id-modal-input"
        maxlength="${MAX_SHARE_ID}"
        value="${escapeAttr(opts.currentId)}"
        spellcheck="false"
        autocomplete="off"
        aria-describedby="share-id-modal-error"
      />
      <p id="share-id-modal-error" class="share-id-modal-error" role="alert" hidden></p>
    `,
    actionsHtml: `
      <button type="button" id="share-id-cancel" class="btn-ghost">${escapeHtml(m.cancel)}</button>
      <button type="button" id="share-id-confirm" class="btn-primary">${escapeHtml(m.shareIdConfirm)}</button>
    `,
    initialFocus: '#share-id-input',
    onClose: () => opts.onFocusBack(),
  });

  const input = modal.dialog.querySelector<HTMLInputElement>('#share-id-input')!;
  const errEl = modal.dialog.querySelector<HTMLElement>('#share-id-modal-error')!;
  const confirmBtn = modal.dialog.querySelector<HTMLButtonElement>('#share-id-confirm')!;

  const showError = (msg: string | null) => {
    if (!msg) {
      errEl.hidden = true;
      errEl.textContent = '';
      input.classList.remove('is-invalid');
      return;
    }
    errEl.hidden = false;
    errEl.textContent = msg;
    input.classList.add('is-invalid');
  };

  modal.dialog.querySelector('#share-id-cancel')!.addEventListener('click', () => modal.close());

  const submit = async () => {
    const next = input.value.trim();
    const localErr = validateShareId(next);
    if (localErr) {
      showError(localErr);
      input.focus();
      return;
    }
    if (next === opts.currentId) {
      modal.close();
      return;
    }
    confirmBtn.disabled = true;
    confirmBtn.textContent = t().saving;
    showError(null);
    try {
      const updated = await api.update(opts.getSecret(), { id: next });
      opts.onSaved(updated);
      modal.close();
    } catch (err) {
      if (err instanceof ApiError && err.fields?.id) {
        showError(err.fields.id);
      } else if (err instanceof ApiError && err.status === 404) {
        showError(t().editLinkInvalid);
      } else {
        showError(err instanceof ApiError ? err.message : t().saveFailed);
      }
      confirmBtn.disabled = false;
      confirmBtn.textContent = t().shareIdConfirm;
      input.focus();
    }
  };

  confirmBtn.addEventListener('click', () => void submit());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  });
  input.addEventListener('input', () => showError(null));
}

/** secret 失效后，把当前正文带到首页新建。 */
function showSaveAsNew(
  root: HTMLElement,
  titleEl: HTMLInputElement,
  contentEl: HTMLTextAreaElement,
  format: NoteFormat,
): void {
  root.querySelector<HTMLButtonElement>('#save-as-new')?.remove();
  const btn = document.createElement('button');
  btn.id = 'save-as-new';
  btn.type = 'button';
  btn.className = 'btn-ghost';
  btn.style.marginTop = '8px';
  btn.textContent = t().saveAsNew;
  btn.addEventListener('click', () => {
    sessionStorage.setItem(
      'plainnote-draft',
      JSON.stringify({ title: titleEl.value || null, content: contentEl.value, format }),
    );
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new Event('popstate'));
  });
  root.querySelector<HTMLElement>('#error')?.after(btn);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '\n');
}
function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/"/g, '&quot;');
}
