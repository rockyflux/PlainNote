import { brandBarHtml } from '../components/BrandBar';
import { footerHtml } from '../components/Footer';
import { copyText, toast } from '../lib/dom';
import { publicOrigin } from '../lib/origin';
import { bindLangSwitch, docsPath, getLang, setLang, t, type Lang } from '../lib/i18n';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function endpoint(
  method: string,
  path: string,
  desc: string,
  curl: string,
  copyLabel: string,
  opts?: { note?: string; responseLabel?: string; response?: string },
): string {
  const methodClass = method.toLowerCase();
  const responseBlock =
    opts?.response && opts.responseLabel
      ? `
      <p class="api-desc" style="margin-top:12px;">${escapeHtml(opts.responseLabel)}</p>
      <div class="api-code-wrap">
        <pre class="api-code"><code>${escapeHtml(opts.response)}</code></pre>
        <button type="button" class="api-copy" data-copy>${escapeHtml(copyLabel)}</button>
      </div>`
      : '';
  return `
    <section class="api-endpoint">
      <div class="api-endpoint-head">
        <span class="api-method ${methodClass}">${method}</span>
        <code class="api-path">${escapeHtml(path)}</code>
      </div>
      <p class="api-desc">${escapeHtml(desc)}</p>
      ${opts?.note ? `<p class="api-note">${escapeHtml(opts.note)}</p>` : ''}
      <div class="api-code-wrap">
        <pre class="api-code"><code>${escapeHtml(curl)}</code></pre>
        <button type="button" class="api-copy" data-copy>${escapeHtml(copyLabel)}</button>
      </div>
      ${responseBlock}
    </section>
  `;
}

function ensureDocsPath(lang: Lang): void {
  const target = docsPath(lang);
  if (window.location.pathname.replace(/\/+$/, '') === target) return;
  window.history.replaceState({}, '', target);
}

export function mountApi(root: HTMLElement, langHint?: Lang): void {
  if (langHint && langHint !== getLang()) {
    setLang(langHint);
  }
  ensureDocsPath(getLang());

  const m = t();
  const origin = publicOrigin();
  const createCurl = `curl -X POST ${origin}/api/notes \\
  -H "Content-Type: application/json" \\
  -d '${m.apiCreateCurlBody}'`;
  const bySecretCurl = `curl ${origin}/api/notes/by-secret/<secret>`;
  const publicCurl = `curl ${origin}/api/notes/<id>`;
  const patchCurl = `curl -X PATCH ${origin}/api/notes/<secret> \\
  -H "Content-Type: application/json" \\
  -d '${m.apiPatchCurlBody}'`;
  const deleteCurl = `curl -X DELETE ${origin}/api/notes/<secret>`;
  const rawCurl = `curl ${origin}/raw/<id>`;
  const createResponse = m.apiCreateResponse.replaceAll('{{origin}}', origin);

  document.title = `${m.apiTitle} · PlainNote`;

  const conventions = m.apiConventions
    .map((item) => `<li>${item.replaceAll('{{origin}}', escapeHtml(origin))}</li>`)
    .join('');
  const errorRows = m.apiErrors
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.http)}</td><td><code>${escapeHtml(row.code)}</code></td><td>${escapeHtml(row.desc)}</td></tr>`,
    )
    .join('');

  root.innerHTML = `
    <div class="wrap wrap-api">
      ${brandBarHtml()}
      <header class="api-hero">
        <h1>${escapeHtml(m.apiTitle)}</h1>
        <p>${escapeHtml(m.apiLead)}</p>
      </header>

      <section class="api-card">
        <h2>${escapeHtml(m.apiConventionsTitle)}</h2>
        <ul class="api-list">
          ${conventions}
        </ul>
      </section>

      <section class="api-card">
        <h2>${escapeHtml(m.apiLinksTitle)}</h2>
        <table class="api-table">
          <thead>
            <tr><th>${escapeHtml(m.apiLinksColLink)}</th><th>${escapeHtml(m.apiLinksColPath)}</th><th>${escapeHtml(m.apiLinksColAccess)}</th></tr>
          </thead>
          <tbody>
            <tr><td>${escapeHtml(m.apiLinkEdit)}</td><td><code>/edit/{secret}</code></td><td>${escapeHtml(m.apiLinkEditAccess)}</td></tr>
            <tr><td>${escapeHtml(m.apiLinkNote)}</td><td><code>/note/{id}</code></td><td>${escapeHtml(m.apiLinkNoteAccess)}</td></tr>
            <tr><td>${escapeHtml(m.apiLinkRaw)}</td><td><code>/raw/{id}</code></td><td>${escapeHtml(m.apiLinkRawAccess)}</td></tr>
          </tbody>
        </table>
      </section>

      <h2 class="api-section-title">${escapeHtml(m.apiSectionTitle)}</h2>

      ${endpoint('POST', '/api/notes', m.apiPostCreate, createCurl, m.copy, {
        responseLabel: m.apiResponseLabel,
        response: createResponse,
      })}
      ${endpoint('GET', '/api/notes/by-secret/:secret', m.apiGetBySecret, bySecretCurl, m.copy)}
      ${endpoint('GET', '/api/notes/:id', m.apiGetPublic, publicCurl, m.copy)}
      ${endpoint('PATCH', '/api/notes/:secret', m.apiPatch, patchCurl, m.copy)}
      ${endpoint('DELETE', '/api/notes/:secret', m.apiDelete, deleteCurl, m.copy)}
      ${endpoint('GET', '/raw/:id', m.apiRaw, rawCurl, m.copy, { note: m.apiRawNote })}

      <section class="api-card">
        <h2>${escapeHtml(m.apiErrorsTitle)}</h2>
        <p class="api-desc">${escapeHtml(m.apiErrorsLead)}</p>
        <div class="api-code-wrap">
          <pre class="api-code"><code>${escapeHtml(m.apiErrorSample)}</code></pre>
          <button type="button" class="api-copy" data-copy>${escapeHtml(m.copy)}</button>
        </div>
        <table class="api-table" style="margin-top:16px;">
          <thead>
            <tr><th>${escapeHtml(m.apiErrorsColHttp)}</th><th>${escapeHtml(m.apiErrorsColCode)}</th><th>${escapeHtml(m.apiErrorsColDesc)}</th></tr>
          </thead>
          <tbody>
            ${errorRows}
          </tbody>
        </table>
      </section>
    </div>
    ${footerHtml()}
  `;

  bindLangSwitch(root, () => {
    ensureDocsPath(getLang());
    mountApi(root);
  });

  root.querySelector<HTMLButtonElement>('#new-note')!.addEventListener('click', () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new Event('popstate'));
  });

  root.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const msgs = t();
      const code = btn.parentElement?.querySelector('code')?.textContent ?? '';
      const ok = await copyText(code);
      btn.textContent = ok ? msgs.copied : msgs.copyFailed;
      if (ok) toast(msgs.copiedToast);
      window.setTimeout(() => {
        btn.textContent = msgs.copy;
      }, 1500);
    });
  });
}
