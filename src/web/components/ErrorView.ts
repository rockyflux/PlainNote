import { topbarHtml } from './TopBar';
import { t } from '../lib/i18n';

export type ErrorKind = 'not_found' | 'load_failed';

export interface ErrorViewOptions {
  kind?: ErrorKind;
  message: string;
  onRetry?: () => void;
}

export function renderErrorView(
  root: HTMLElement,
  messageOrOptions: string | ErrorViewOptions,
): void {
  const m = t();
  const options: ErrorViewOptions =
    typeof messageOrOptions === 'string'
      ? { kind: 'not_found', message: messageOrOptions }
      : messageOrOptions;

  const kind = options.kind ?? 'not_found';
  const codeLabel = kind === 'not_found' ? '404' : m.errorLoadFailedCode;
  const hint =
    kind === 'not_found'
      ? `<p class="error-hint">${m.errorHintNotFound}</p>`
      : `<p class="error-hint">${escapeHtml(m.errorHintLoadFailed)}</p>`;

  const actions =
    kind === 'load_failed' && options.onRetry
      ? `
        <div class="error-actions">
          <button class="btn-primary" id="error-retry" type="button">${escapeHtml(m.retry)}</button>
          <button class="btn-ghost" id="error-home" type="button">${escapeHtml(m.backHome)}</button>
        </div>
      `
      : `
        <div class="error-actions">
          <button class="btn-primary" id="error-home" type="button">${escapeHtml(m.backHome)}</button>
        </div>
      `;

  root.innerHTML = `
    ${topbarHtml()}
    <div class="error-view" role="alert">
      <div class="code">${escapeHtml(codeLabel)}</div>
      <p>${escapeHtml(options.message)}</p>
      ${hint}
      ${actions}
    </div>
  `;

  root.querySelector<HTMLButtonElement>('#error-home')?.addEventListener('click', () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new Event('popstate'));
  });

  root.querySelector<HTMLButtonElement>('#error-retry')?.addEventListener('click', () => {
    options.onRetry?.();
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
