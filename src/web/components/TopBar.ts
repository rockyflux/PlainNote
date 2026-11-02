import { docsPath, t } from '../lib/i18n';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function topbarHtml(): string {
  const m = t();
  return `
    <div class="topbar">
      <a class="brand" href="/">PlainNote</a>
      <div class="topbar-right">
        <span class="hint-link">${escapeHtml(m.footerHint)}</span>
        <a class="nav-link" href="${docsPath()}">${escapeHtml(m.footerApi)}</a>
      </div>
    </div>
  `;
}
