import { langSwitchHtml, t } from '../lib/i18n';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function brandBarHtml(opts?: { newBtnDisabled?: boolean }): string {
  const m = t();
  const disabled = opts?.newBtnDisabled ? ' disabled' : '';
  return `
    <header class="note-brand-bar">
      <a class="note-brand-name" href="/">
        PlainNote<span class="note-brand-tag">${escapeHtml(m.brandTag)}</span>
      </a>
      <div class="note-brand-actions">
        ${langSwitchHtml()}
        <button type="button" id="new-note" class="btn-ghost hero-new-btn"${disabled}>${escapeHtml(m.newNote)}</button>
      </div>
    </header>
  `;
}
