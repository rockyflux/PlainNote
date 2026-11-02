import { api, ApiError, type NotePublic } from '../lib/api';
import { renderMarkdown } from '../lib/markdown';
import { copyText, toast, formatTime, downloadNote } from '../lib/dom';
import { publicOrigin } from '../lib/origin';
import { brandBarHtml } from '../components/BrandBar';
import { footerHtml } from '../components/Footer';
import { renderErrorView } from '../components/ErrorView';
import { bindLangSwitch, t } from '../lib/i18n';

function displayTitle(note: NotePublic): string {
  if (note.title) return note.title;
  const firstLine = note.content.split('\n').find((line) => line.trim()) ?? '';
  return firstLine.replace(/^#+\s*/, '').slice(0, 40) || t().untitled;
}

function skeletonHtml(): string {
  const m = t();
  return `
    <div class="wrap" aria-busy="true" aria-live="polite">
      ${brandBarHtml({ newBtnDisabled: true })}
      <div class="skeleton-block skeleton-title" style="max-width:60%;"></div>
      <div class="skeleton-line skeleton-w-30" style="margin:10px 0 18px;"></div>
      <div class="skeleton-block skeleton-read"></div>
      <p class="preview-empty" style="margin-top:12px;">${escapeHtml(m.loading)}</p>
    </div>
    ${footerHtml()}
  `;
}

export function mountNote(root: HTMLElement, id: string): void {
  const load = () => {
    root.innerHTML = skeletonHtml();
    api
      .getPublic(id)
      .then((note) => renderRead(root, note))
      .catch((err: unknown) => {
        const m = t();
        if (err instanceof ApiError && err.status === 404) {
          renderErrorView(root, {
            kind: 'not_found',
            message: m.noteNotFound,
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

function renderBody(note: NotePublic): string {
  if (note.format === 'text') {
    return `<pre class="read-plain">${escapeHtml(note.content)}</pre>`;
  }
  return renderMarkdown(note.content);
}

function renderRead(root: HTMLElement, note: NotePublic): void {
  const m = t();
  const title = displayTitle(note);
  const isText = note.format === 'text';
  document.title = `${title} · PlainNote`;

  root.innerHTML = `
    <div class="wrap">
      ${brandBarHtml()}
      <div class="read-header">
        <h1 class="read-title">${escapeHtml(title)}</h1>
        <div class="read-meta">${escapeHtml(m.updatedAt(formatTime(note.updatedAt), isText ? 'Text' : 'Markdown'))}</div>
      </div>
      <div class="read-body${isText ? ' is-text' : ''}">${renderBody(note)}</div>
      <div class="read-actions">
        <button id="copy-link" class="btn-ghost" type="button">${escapeHtml(m.copyNoteLink)}</button>
        <button id="open-raw" class="btn-ghost" type="button">${escapeHtml(m.openRaw)}</button>
        <button id="download" class="btn-ghost" type="button">${escapeHtml(isText ? m.downloadTxt : m.downloadMd)}</button>
      </div>
    </div>
    ${footerHtml()}
  `;

  const noteUrl = `${publicOrigin()}/note/${note.id}`;

  bindLangSwitch(root, () => renderRead(root, note));

  root.querySelector<HTMLButtonElement>('#new-note')!.addEventListener('click', () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new Event('popstate'));
  });
  root.querySelector<HTMLButtonElement>('#copy-link')!.addEventListener('click', async () => {
    const msgs = t();
    (await copyText(noteUrl)) ? toast(msgs.copiedNoteLinkToast) : toast(msgs.copyFailed);
  });
  root.querySelector<HTMLButtonElement>('#open-raw')!.addEventListener('click', () => {
    window.location.href = `/raw/${note.id}`;
  });
  root.querySelector<HTMLButtonElement>('#download')!.addEventListener('click', () => {
    downloadNote(note.title, note.content, isText ? 'text' : 'markdown');
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
