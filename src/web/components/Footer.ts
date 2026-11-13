import { docsPath, t } from '../lib/i18n';
import { APP_VERSION } from '../lib/version';

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
        <a class="nav-link" href="https://github.com/rockyflux/PlainNote" target="_blank" rel="noopener noreferrer">GitHub</a>
        <span class="footer-version" title="plainshare@${escapeHtml(APP_VERSION)}">v${escapeHtml(APP_VERSION)}</span>
      </div>
    </footer>
  `;
}
