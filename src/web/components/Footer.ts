import { docsPath, t } from '../lib/i18n';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function footerHtml(): string {
  const m = t();
  return `
    <footer class="site-footer">
      <a class="brand" href="/">PlainNote</a>
      <div class="footer-right">
        <span class="hint-link">${escapeHtml(m.footerHint)}</span>
        <a class="nav-link" href="${docsPath()}">${escapeHtml(m.footerApi)}</a>
      </div>
    </footer>
  `;
}
