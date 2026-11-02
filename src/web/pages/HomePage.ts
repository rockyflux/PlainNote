import { api, type NoteFormat, type NoteFull, ApiError } from '../lib/api';
import { renderMarkdown } from '../lib/markdown';
import { codeLength, copyText, toast, formatTime } from '../lib/dom';
import { clientLanguage, clientTimezone } from '../lib/client-meta';
import { listHistory, removeHistory, upsertHistory, type HistoryItem } from '../lib/history';
import { openModal } from '../lib/modal';
import { footerHtml } from '../components/Footer';
import { applyDocumentLang, bindLangSwitch, langSwitchHtml, t } from '../lib/i18n';

const MAX_CONTENT = 30_000;
const AUTO_TITLE_LEN = 30;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 从正文抽取纯文字前 N 个字符作为标题；空则 null。 */
function autoTitleFromContent(content: string, max = AUTO_TITLE_LEN): string | null {
  const plain = content
    .replace(/\r\n?/g, '\n')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/[*_~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return null;
  return [...plain].slice(0, max).join('');
}

function lineCount(text: string): number {
  if (text.length === 0) return 1;
  return text.split('\n').length;
}

function sectionHead(title: string, meta?: string): string {
  return `
    <header class="section-head">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      ${meta ? `<span class="section-meta">${escapeHtml(meta)}</span>` : ''}
    </header>
  `;
}

function faqHtml(): string {
  const m = t();
  const items = m.faqs
    .map(
      (item) => `
      <details class="faq-item">
        <summary class="faq-q">${escapeHtml(item.q)}</summary>
        <p class="faq-a">${escapeHtml(item.a)}</p>
      </details>
    `,
    )
    .join('');

  return `
    <section class="home-section faq-section" aria-label="${escapeHtml(m.faqLabel)}">
      ${sectionHead(m.faqLabel)}
      <div class="faq-list">
        ${items}
      </div>
    </section>
  `;
}

function useCasesHtml(): string {
  const m = t();
  const items = m.useCases
    .map(
      (c, i) => `
      <article class="usecase-row">
        <span class="usecase-index" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
        <div class="usecase-copy">
          <h3 class="usecase-title">${escapeHtml(c.title)}</h3>
          <p class="usecase-body">${escapeHtml(c.body)}</p>
        </div>
        <code class="usecase-example">${escapeHtml(c.example)}</code>
      </article>
    `,
    )
    .join('');

  return `
    <section class="home-section usecases-section" aria-label="${escapeHtml(m.useCasesLabel)}">
      ${sectionHead(m.useCasesLabel, m.useCasesMeta)}
      <div class="usecases-list">
        ${items}
      </div>
    </section>
  `;
}

function homeExtrasHtml(): string {
  return `${useCasesHtml()}${faqHtml()}`;
}

function editorHtml(): string {
  const m = t();
  return `
    <div class="wrap">
      <header class="home-hero home-hero-row">
        <div class="home-hero-copy">
          <h1 class="home-hero-title">${escapeHtml(m.heroTitle)}</h1>
          <p class="home-hero-lead">${escapeHtml(m.heroLead)}</p>
        </div>
        ${langSwitchHtml()}
      </header>
      <div class="snippet-window" id="snippet">
        <div class="snippet-chrome">
          <div class="snippet-dots" aria-hidden="true">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <div class="mode-switch" role="group" aria-label="${escapeHtml(m.modeLabel)}">
            <button type="button" class="mode-switch-btn is-active" data-mode="text" aria-pressed="true">Text</button>
            <button type="button" class="mode-switch-btn" data-mode="markdown" aria-pressed="false">Markdown</button>
          </div>
        </div>
        <div class="snippet-body" id="snippet-body">
          <textarea
            id="content"
            class="snippet-textarea"
            placeholder="${escapeHtml(m.placeholder)}"
            spellcheck="false"
            aria-label="${escapeHtml(m.contentLabel)}"
          ></textarea>
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
      <div class="snippet-actions">
        <button id="submit" class="btn-create" type="button" disabled>${escapeHtml(m.createBtn)}</button>
        <span class="hotkey-hint">${escapeHtml(m.hotkeyHint)}</span>
      </div>
      <div id="error" class="error-inline" role="alert"></div>
      <section id="history" class="home-section history-section" aria-label="${escapeHtml(m.historyLabel)}"></section>
      ${homeExtrasHtml()}
    </div>
    ${footerHtml()}
  `;
}

function historyItemHtml(item: HistoryItem): string {
  const m = t();
  const title = item.title?.trim() ? escapeHtml(item.title) : m.untitled;
  const editPath = `/edit/${encodeURIComponent(item.secret)}`;
  const notePath = `/note/${encodeURIComponent(item.id)}`;
  return `
    <li class="history-item" data-id="${escapeHtml(item.id)}">
      <a class="history-title" href="${editPath}">${title}</a>
      <time class="history-time" datetime="${new Date(item.createdAt).toISOString()}">${formatTime(item.createdAt)}</time>
      <div class="history-actions">
        <a class="history-link" href="${notePath}">${escapeHtml(m.historyView)}</a>
        <a class="history-link" href="${editPath}">${escapeHtml(m.historyEdit)}</a>
        <button type="button" class="history-remove" data-remove="${escapeHtml(item.id)}" aria-label="${escapeHtml(m.historyRemove)}">${escapeHtml(m.historyRemove)}</button>
      </div>
    </li>
  `;
}

function renderHistorySection(container: HTMLElement): void {
  const m = t();
  const items = listHistory();
  if (items.length === 0) {
    container.innerHTML = `
      ${sectionHead(m.historyLabel, m.historyMetaLocal)}
      <p class="history-empty">${escapeHtml(m.historyEmpty)}</p>
    `;
    return;
  }

  container.innerHTML = `
    ${sectionHead(m.historyLabel, m.historyMetaCount(items.length))}
    <ul class="history-list">
      ${items.map(historyItemHtml).join('')}
    </ul>
  `;

  container.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.remove;
      if (!id) return;
      removeHistory(id);
      renderHistorySection(container);
      toast(t().historyRemovedToast);
    });
  });
}

function linkRowHtml(label: string, url: string, privateRow: boolean, key: string): string {
  const m = t();
  return `
    <div class="link-row ${privateRow ? 'private' : ''}">
      <div class="link-label">${label}</div>
      <div class="link-box">
        <span class="link-url">${escapeHtml(url)}</span>
        <button type="button" data-copy="${key}" aria-label="${escapeHtml(m.copy)}${escapeHtml(label)}">${escapeHtml(m.copy)}</button>
      </div>
    </div>
  `;
}

function showCreateSuccessModal(root: HTMLElement, note: NoteFull): void {
  const m = t();
  const bodyHtml = `
    <div class="result-warning">
      ${escapeHtml(m.successWarning)}
    </div>
    ${linkRowHtml(m.linkEdit, note.editUrl, true, 'edit')}
    ${linkRowHtml(m.linkNote, note.noteUrl, false, 'note')}
    ${linkRowHtml(m.linkRaw, note.rawUrl, false, 'raw')}
    <div class="result-meta">${escapeHtml(m.createdAt(formatTime(note.createdAt)))}</div>
  `;

  let skipRemount = false;
  const modal = openModal({
    title: m.successTitle,
    closeLabel: m.close,
    bodyHtml,
    actionsHtml: `
      <button type="button" id="open-edit" class="btn-ghost">${escapeHtml(m.openEdit)}</button>
      <button type="button" id="new-one" class="btn-primary">${escapeHtml(m.writeAnother)}</button>
    `,
    initialFocus: '#new-one',
    onClose: () => {
      if (!skipRemount) mountHome(root);
    },
  });

  modal.dialog.classList.add('modal-wide');

  const copyMap: Record<string, string> = {
    edit: note.editUrl,
    note: note.noteUrl,
    raw: note.rawUrl,
  };
  modal.dialog.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const msgs = t();
      const ok = await copyText(copyMap[btn.dataset.copy!]!);
      btn.textContent = ok ? msgs.copied : msgs.copyFailedManual;
      if (ok) toast(msgs.copiedToast);
      window.setTimeout(() => {
        btn.textContent = msgs.copy;
      }, 1500);
    });
  });

  modal.dialog.querySelector<HTMLButtonElement>('#open-edit')?.addEventListener('click', () => {
    skipRemount = true;
    modal.close();
    window.history.pushState({}, '', note.editUrl.replace(/^https?:\/\/[^/]+/, ''));
    window.dispatchEvent(new Event('popstate'));
  });

  modal.dialog.querySelector<HTMLButtonElement>('#new-one')?.addEventListener('click', () => {
    modal.close();
  });
}

function persistDraft(content: string, format: NoteFormat): void {
  try {
    sessionStorage.setItem('plainnote-draft', JSON.stringify({ content, format }));
  } catch {
    // ignore quota / private mode
  }
}

export function mountHome(root: HTMLElement): void {
  applyDocumentLang();
  root.innerHTML = editorHtml();

  const bodyEl = root.querySelector<HTMLElement>('#snippet-body')!;
  const contentEl = root.querySelector<HTMLTextAreaElement>('#content')!;
  const previewEl = root.querySelector<HTMLElement>('#preview')!;
  const counterEl = root.querySelector<HTMLElement>('#counter')!;
  const linesEl = root.querySelector<HTMLElement>('#lines')!;
  const meterFill = root.querySelector<HTMLElement>('#meter-fill')!;
  const submitBtn = root.querySelector<HTMLButtonElement>('#submit')!;
  const modeBtns = root.querySelectorAll<HTMLButtonElement>('.mode-switch-btn');
  const errorEl = root.querySelector<HTMLElement>('#error')!;

  let format: NoteFormat = 'text';
  let previewTimer: number | undefined;

  const refreshPreview = () => {
    if (format !== 'markdown') return;
    const text = contentEl.value;
    previewEl.innerHTML = text.trim()
      ? renderMarkdown(text)
      : `<span class="preview-empty">${escapeHtml(t().previewEmpty)}</span>`;
  };

  const setFormat = (next: NoteFormat) => {
    format = next;
    const on = next === 'markdown';
    modeBtns.forEach((btn) => {
      const active = btn.dataset.mode === next;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    bodyEl.classList.toggle('is-split', on);
    previewEl.hidden = !on;
    if (on) refreshPreview();
  };

  const refreshCounter = () => {
    const msgs = t();
    const text = contentEl.value;
    const len = codeLength(text);
    const over = len > MAX_CONTENT;
    const ratio = Math.min(1, len / MAX_CONTENT);
    counterEl.textContent = `${len.toLocaleString('en-US')} / ${MAX_CONTENT.toLocaleString('en-US')}`;
    counterEl.style.color = over ? 'var(--danger)' : '';
    meterFill.style.width = `${ratio * 100}%`;
    meterFill.classList.toggle('is-over', over);
    const n = lineCount(text);
    linesEl.textContent = n === 1 ? msgs.linesOne : msgs.linesMany(n);
    submitBtn.disabled = over || text.trim().length === 0;
  };

  bindLangSwitch(root, () => {
    persistDraft(contentEl.value, format);
    mountHome(root);
  });

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      setFormat(btn.dataset.mode === 'markdown' ? 'markdown' : 'text');
    });
  });

  contentEl.addEventListener('input', () => {
    refreshCounter();
    if (format !== 'markdown') return;
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(refreshPreview, 200);
  });

  const submit = async () => {
    const msgs = t();
    errorEl.textContent = '';
    const content = contentEl.value;
    if (!content.trim()) {
      errorEl.textContent = msgs.emptyContent;
      return;
    }
    if (codeLength(content) > MAX_CONTENT) {
      errorEl.textContent = msgs.overLimit(MAX_CONTENT);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = msgs.creating;
    try {
      const note = await api.create({
        title: autoTitleFromContent(content),
        content,
        format,
        timezone: clientTimezone(),
        language: clientLanguage(),
      });
      upsertHistory({
        id: note.id,
        secret: note.secret,
        title: note.title,
        createdAt: note.createdAt,
      });
      showCreateSuccessModal(root, note);
      renderHistorySection(root.querySelector<HTMLElement>('#history')!);
    } catch (err) {
      errorEl.textContent = err instanceof ApiError ? err.message : msgs.createFailed;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = t().createBtn;
      refreshCounter();
    }
  };

  submitBtn.addEventListener('click', submit);
  contentEl.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  });

  const restoreDraft = () => {
    try {
      const raw = sessionStorage.getItem('plainnote-draft');
      if (!raw) return;
      const draft = JSON.parse(raw) as { content?: string; format?: NoteFormat };
      if (typeof draft.content === 'string') contentEl.value = draft.content;
      if (draft.format === 'markdown' || draft.format === 'text') setFormat(draft.format);
      sessionStorage.removeItem('plainnote-draft');
    } catch {
      // 草稿损坏则忽略，不影响新建。
    }
  };

  setFormat('text');
  restoreDraft();
  refreshCounter();
  renderHistorySection(root.querySelector<HTMLElement>('#history')!);
  contentEl.focus();
}
