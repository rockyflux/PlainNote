export type Lang = 'zh' | 'en';

const STORAGE_KEY = 'plainnote-lang';

export type Messages = {
  /* shared */
  langSwitchLabel: string;
  brandTag: string;
  newNote: string;
  footerHint: string;
  footerApi: string;
  modeLabel: string;
  contentLabel: string;
  previewEmpty: string;
  linesOne: string;
  linesMany: (n: number) => string;
  hotkeyHint: string;
  emptyContent: string;
  overLimit: (max: number) => string;
  untitled: string;
  close: string;
  cancel: string;
  copy: string;
  copyFailed: string;
  copyFailedManual: string;
  copiedToast: string;
  loading: string;
  pageNotFound: string;

  /* home */
  heroTitle: string;
  heroLead: string;
  placeholder: string;
  createBtn: string;
  creating: string;
  createFailed: string;
  historyLabel: string;
  historyMetaLocal: string;
  historyMetaCount: (n: number) => string;
  historyEmpty: string;
  historyView: string;
  historyEdit: string;
  historyRemove: string;
  historyRemovedToast: string;
  useCasesLabel: string;
  useCasesMeta: string;
  faqLabel: string;
  successTitle: string;
  successWarning: string;
  linkEdit: string;
  linkNote: string;
  linkRaw: string;
  createdAt: (time: string) => string;
  copied: string;
  openEdit: string;
  writeAnother: string;
  useCases: ReadonlyArray<{ title: string; body: string; example: string }>;
  faqs: ReadonlyArray<{ q: string; a: string }>;

  /* edit */
  editDefaultTitle: string;
  editWarn: string;
  editWarnDismiss: string;
  editWarnDismissAria: string;
  titlePlaceholder: string;
  shareIdEditTitle: (id: string) => string;
  shareIdUpdatedToast: string;
  copyNoteLink: string;
  copyRawLink: string;
  download: string;
  downloadMd: string;
  downloadTxt: string;
  deleteNote: string;
  saveChanges: string;
  saving: string;
  savedToast: string;
  leaveUnsavedConfirm: string;
  editLinkInvalid: string;
  saveFailed: string;
  copiedNoteLinkToast: string;
  copiedRawLinkToast: string;
  deleteConfirmTitle: string;
  deleteConfirmBody: string;
  deleteConfirmBtn: string;
  deleting: string;
  deletedToast: string;
  deleteFailed: string;
  shareIdModalTitle: string;
  shareIdModalDesc: (min: number, max: number) => string;
  shareIdModalLabel: string;
  shareIdConfirm: string;
  shareIdEmpty: string;
  shareIdLen: (min: number, max: number) => string;
  shareIdCharset: string;
  saveAsNew: string;
  editNotFound: string;
  loadFailed: string;

  /* note (read) */
  updatedAt: (time: string, formatLabel: string) => string;
  openRaw: string;
  noteNotFound: string;

  /* error view */
  errorLoadFailedCode: string;
  errorHintNotFound: string;
  errorHintLoadFailed: string;
  retry: string;
  backHome: string;

  /* api / docs */
  apiTitle: string;
  apiLead: string;
  apiConventionsTitle: string;
  apiConventions: ReadonlyArray<string>;
  apiLinksTitle: string;
  apiLinksColLink: string;
  apiLinksColPath: string;
  apiLinksColAccess: string;
  apiLinkEdit: string;
  apiLinkEditAccess: string;
  apiLinkNote: string;
  apiLinkNoteAccess: string;
  apiLinkRaw: string;
  apiLinkRawAccess: string;
  apiSectionTitle: string;
  apiPostCreate: string;
  apiGetBySecret: string;
  apiGetPublic: string;
  apiPatch: string;
  apiDelete: string;
  apiRaw: string;
  apiRawNote: string;
  apiErrorsTitle: string;
  apiErrorsLead: string;
  apiErrorSample: string;
  apiErrorsColHttp: string;
  apiErrorsColCode: string;
  apiErrorsColDesc: string;
  apiErrors: ReadonlyArray<{ http: string; code: string; desc: string }>;
  apiCreateCurlBody: string;
  apiPatchCurlBody: string;
  apiResponseLabel: string;
  /** 创建成功返回示例；可用 {{origin}} */
  apiCreateResponse: string;
};

const ZH: Messages = {
  langSwitchLabel: '语言',
  brandTag: '免费文本托管',
  newNote: '+ 新建',
  footerHint: '匿名 · 免登录 · 网页阅读 + Raw 纯文本',
  footerApi: 'API',
  modeLabel: '编辑模式',
  contentLabel: '笔记正文',
  previewEmpty: '预览将显示在这里',
  linesOne: '1 line',
  linesMany: (n) => `${n} lines`,
  hotkeyHint: 'Ctrl + Enter',
  emptyContent: '正文不能为空',
  overLimit: (max) => `正文超出 ${max} 字符上限`,
  untitled: '未命名笔记',
  close: '关闭',
  cancel: '取消',
  copy: '复制',
  copyFailed: '复制失败',
  copyFailedManual: '复制失败，请手动选择',
  copiedToast: '已复制到剪贴板',
  loading: '正在加载…',
  pageNotFound: '页面不存在。',

  heroTitle: '免费文本托管',
  heroLead: '把文本粘贴进来，就能得到一个纯文本直链地址。免费使用，无需注册账号。',
  placeholder: '// 在此粘贴或输入文本…',
  createBtn: 'Create Snippet →',
  creating: 'Creating…',
  createFailed: '创建失败，请重试',
  historyLabel: '本机历史',
  historyMetaLocal: '仅本机可见',
  historyMetaCount: (n) => `仅本机 · ${n}`,
  historyEmpty: '创建后会出现在这里，保存在本浏览器。',
  historyView: '查看',
  historyEdit: '编辑',
  historyRemove: '移除',
  historyRemovedToast: '已从本机历史移除',
  useCasesLabel: '使用场景',
  useCasesMeta: '一条笔记 · 三种链接',
  faqLabel: '常见问题',
  successTitle: '✅ 笔记已创建',
  successWarning:
    '⚠ 请妥善保存【编辑链接】。它是修改和删除笔记的唯一凭证，一旦丢失无法找回。对外分享时，请勿分享编辑链接。',
  linkEdit: '✏️ 编辑链接（私有，请勿公开）',
  linkNote: '👁 网页只读链接（发给人看）',
  linkRaw: '🧩 Raw 纯文本链接（给程序 / curl）',
  createdAt: (time) => `创建时间：${time}`,
  copied: '✓ 已复制',
  openEdit: '打开编辑页',
  writeAnother: '再写一篇',
  useCases: [
    {
      title: '功能开关',
      body: '启动时 curl Raw；改编辑链接即可翻转开关，无需重新部署。',
      example: 'curl -s …/raw/flags',
    },
    {
      title: '紧急熔断',
      body: '服务轮询 Raw；紧急时改一行配置，全局秒级关闭。',
      example: 'enabled=true → false',
    },
    {
      title: 'Prompt 托管',
      body: '编辑链接维护 Prompt，推理侧拉 Raw——无 HTML，正文原样入模。',
      example: 'curl …/raw/prompt | llm',
    },
    {
      title: '故障广播',
      body: '一人编辑、多人只读。网页给人看，Raw 给机器人抓。',
      example: '只读链接 → #incidents',
    },
    {
      title: '样例载荷',
      body: '调试 JSON 存成笔记，文档与 Issue 里直接贴 Raw。',
      example: 'curl …/raw/payload',
    },
    {
      title: '跨设备剪贴板',
      body: '笔记本写，手机打开。无需账号，一个 URL 就是当前文本。',
      example: '手机 → /note 或 /raw',
    },
  ],
  faqs: [
    {
      q: 'PlainNote 是什么？',
      a: '匿名、免登录的轻量笔记服务。写一次，得到三条链接：私有编辑、网页只读（Markdown）、Raw 纯文本（text/plain）。',
    },
    {
      q: '需要注册吗？',
      a: '不需要。无注册、无登录、无订阅。权限完全由链接本身承担。',
    },
    {
      q: '编辑链接如何工作？',
      a: 'URL 内嵌密钥。持有即可修改或删除；丢失无法找回。请妥善保存，勿对外分享。',
    },
    {
      q: '三条链接有何不同？',
      a: '只读给人看 Markdown；Raw 返回纯文本，适合 curl / 脚本 / LLM；编辑链接留给维护者。',
    },
    {
      q: '笔记保存多久？',
      a: '默认永久保存（服务与数据库在即可）。本机历史仅存浏览器 localStorage，不影响服务端。',
    },
  ],

  editDefaultTitle: '编辑笔记',
  editWarn:
    '⚠ 请妥善保存本页地址栏中的【编辑链接】。它是修改和删除的唯一凭证，丢失后无法找回。',
  editWarnDismiss: '知道了',
  editWarnDismissAria: '关闭警示',
  titlePlaceholder: '标题（可选）',
  shareIdEditTitle: (id) => `修改分享码 ${id}`,
  shareIdUpdatedToast: '✓ 分享码已更新',
  copyNoteLink: '复制网页链接',
  copyRawLink: '复制 Raw 链接',
  download: '下载',
  downloadMd: '下载 .md',
  downloadTxt: '下载 .txt',
  deleteNote: '删除笔记',
  saveChanges: '保存修改',
  saving: '保存中…',
  savedToast: '✓ 已保存',
  leaveUnsavedConfirm: '有未保存的修改，确定离开并新建吗？',
  editLinkInvalid: '编辑链接已失效，笔记可能已被删除。',
  saveFailed: '保存失败，请重试',
  copiedNoteLinkToast: '已复制网页链接',
  copiedRawLinkToast: '已复制 Raw 链接',
  deleteConfirmTitle: '删除这篇笔记？',
  deleteConfirmBody: '删除后，编辑链接、网页链接、Raw 链接全部失效，且无法恢复。此操作不可撤销。',
  deleteConfirmBtn: '确认删除',
  deleting: '删除中…',
  deletedToast: '笔记已删除',
  deleteFailed: '删除失败，请重试',
  shareIdModalTitle: '修改分享码',
  shareIdModalDesc: (min, max) =>
    `分享码会出现在网页链接与 Raw 链接中（如 <code>/note/你的码</code>）。仅支持字母、数字与短横线，长度 ${min}–${max} 个字符。修改成功后，旧的分享链接将立即失效。`,
  shareIdModalLabel: '新的分享码',
  shareIdConfirm: '确认修改',
  shareIdEmpty: '分享码不能为空',
  shareIdLen: (min, max) => `长度需在 ${min}–${max} 个字符之间`,
  shareIdCharset: '仅支持字母、数字与短横线（-）',
  saveAsNew: '另存为新笔记',
  editNotFound: '笔记不存在，或编辑链接已失效 / 已被删除。',
  loadFailed: '加载失败，请检查网络后重试。',

  updatedAt: (time, formatLabel) => `更新时间：${time} · ${formatLabel}`,
  openRaw: '查看原始文本',
  noteNotFound: '笔记不存在，或链接已失效 / 已被删除。',

  errorLoadFailedCode: '加载失败',
  errorHintNotFound:
    '若是编辑链接，请确认链接完整、未被截断；丢失后无法找回。<br/>若是网页 / Raw 链接，笔记可能已被作者删除。',
  errorHintLoadFailed: '请检查网络连接或稍后重试。',
  retry: '重试',
  backHome: '返回首页写一篇新笔记',

  apiTitle: 'API',
  apiLead:
    '匿名笔记的 HTTP 接口。创建后同时得到编辑链接、网页只读链接与 Raw 纯文本链接，适合 curl、脚本与 LLM 直接消费。',
  apiConventionsTitle: '约定',
  apiConventions: [
    'Base URL：当前实例 <code>{{origin}}</code>',
    '写接口请求 / 响应：<code>application/json; charset=utf-8</code>',
    '鉴权：编辑密钥 <code>secret</code>（24 位）放在 URL 路径段；无 Cookie / Authorization',
    '<code>id</code>（10 位）仅用于只读；只读接口永不返回 <code>secret</code>',
    '标题 ≤ 200 字符（可空）；正文 1–30,000 字符（按 Unicode 码点计数）；标题/正文不得含敏感词',
  ],
  apiLinksTitle: '三链接',
  apiLinksColLink: '链接',
  apiLinksColPath: '路径',
  apiLinksColAccess: '权限',
  apiLinkEdit: '编辑',
  apiLinkEditAccess: '持链可改 / 可删',
  apiLinkNote: '网页只读',
  apiLinkNoteAccess: '任何人只读',
  apiLinkRaw: 'Raw',
  apiLinkRawAccess: '纯文本，给程序用',
  apiSectionTitle: '接口',
  apiPostCreate: '创建笔记，返回 NoteFull（含 secret 与三条链接）。',
  apiGetBySecret: '按编辑密钥加载完整笔记（编辑页初始化）。',
  apiGetPublic: '读取公开笔记。返回 NotePublic，不含 secret。',
  apiPatch: '更新标题和/或正文（至少提供一个字段）。',
  apiDelete: '物理删除笔记；删除后三链接全部失效。',
  apiRaw: '返回原始 Markdown 纯文本，不经 HTML 渲染。',
  apiRawNote: '成功时 Content-Type 为 text/plain；错误也是纯文本（非 JSON）。',
  apiErrorsTitle: '错误格式',
  apiErrorsLead: 'JSON 接口统一错误体：',
  apiErrorSample: `{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "正文不能为空",
    "fields": { "content": "正文为必填项" }
  }
}`,
  apiErrorsColHttp: 'HTTP',
  apiErrorsColCode: 'code',
  apiErrorsColDesc: '说明',
  apiErrors: [
    { http: '400', code: 'BAD_REQUEST', desc: '非法 JSON / 缺少可更新字段' },
    { http: '404', code: 'NOTE_NOT_FOUND', desc: '不存在或 secret 错误（统一文案）' },
    { http: '422', code: 'VALIDATION_FAILED', desc: '空正文、超长、含敏感词等校验失败' },
    { http: '429', code: 'RATE_LIMITED', desc: '创建过于频繁（按 IP 限流）' },
    { http: '500', code: 'INTERNAL_ERROR', desc: '服务端异常' },
  ],
  apiCreateCurlBody: `{"title":"标题","content":"要分享的内容"}`,
  apiPatchCurlBody: `{"content":"更新后的内容"}`,
  apiResponseLabel: '返回示例',
  apiCreateResponse: `{
  "id": "a1b2c3d4e5",
  "secret": "AbCdEfGhIjKlMnOpQrStUvWx",
  "title": "标题",
  "content": "要分享的内容",
  "format": "text",
  "createdAt": 1735689600000,
  "updatedAt": 1735689600000,
  "editUrl": "{{origin}}/edit/AbCdEfGhIjKlMnOpQrStUvWx",
  "noteUrl": "{{origin}}/note/a1b2c3d4e5",
  "rawUrl": "{{origin}}/raw/a1b2c3d4e5"
}`,
};

const EN: Messages = {
  langSwitchLabel: 'Language',
  brandTag: 'Free text hosting',
  newNote: '+ New',
  footerHint: 'Anonymous · no login · web view + raw text',
  footerApi: 'API',
  modeLabel: 'Edit mode',
  contentLabel: 'Note content',
  previewEmpty: 'Preview will appear here',
  linesOne: '1 line',
  linesMany: (n) => `${n} lines`,
  hotkeyHint: 'Ctrl + Enter',
  emptyContent: 'Content cannot be empty',
  overLimit: (max) => `Content exceeds the ${max} character limit`,
  untitled: 'Untitled note',
  close: 'Close',
  cancel: 'Cancel',
  copy: 'Copy',
  copyFailed: 'Copy failed',
  copyFailedManual: 'Copy failed — select manually',
  copiedToast: 'Copied to clipboard',
  loading: 'Loading…',
  pageNotFound: 'Page not found.',

  heroTitle: 'Free text hosting',
  heroLead: 'Paste your text, get a raw plaintext URL. Free to use. No account required.',
  placeholder: '// Paste or type your text here...',
  createBtn: 'Create Snippet →',
  creating: 'Creating…',
  createFailed: 'Create failed. Please try again.',
  historyLabel: 'Local history',
  historyMetaLocal: 'This browser only',
  historyMetaCount: (n) => `Local · ${n}`,
  historyEmpty: 'Created notes will show up here, stored in this browser.',
  historyView: 'View',
  historyEdit: 'Edit',
  historyRemove: 'Remove',
  historyRemovedToast: 'Removed from local history',
  useCasesLabel: 'Use cases',
  useCasesMeta: 'One note · three links',
  faqLabel: 'FAQ',
  successTitle: '✅ Note created',
  successWarning:
    '⚠ Keep the edit link safe. It is the only credential to update or delete this note; lost links cannot be recovered. Never share the edit link publicly.',
  linkEdit: '✏️ Edit link (private — do not share)',
  linkNote: '👁 Read-only web link (for people)',
  linkRaw: '🧩 Raw text link (for scripts / curl)',
  createdAt: (time) => `Created: ${time}`,
  copied: '✓ Copied',
  openEdit: 'Open editor',
  writeAnother: 'Write another',
  useCases: [
    {
      title: 'Feature flags',
      body: 'curl Raw at boot; flip the switch by editing the note — no redeploy.',
      example: 'curl -s …/raw/flags',
    },
    {
      title: 'Emergency kill switch',
      body: 'Services poll Raw; change one line under pressure to shut everything down in seconds.',
      example: 'enabled=true → false',
    },
    {
      title: 'Prompt hosting',
      body: 'Maintain prompts via the edit link; inference pulls Raw — no HTML, body in as-is.',
      example: 'curl …/raw/prompt | llm',
    },
    {
      title: 'Incident broadcast',
      body: 'One editor, many readers. Web view for humans, Raw for bots.',
      example: 'read-only → #incidents',
    },
    {
      title: 'Sample payloads',
      body: 'Store debug JSON as a note; paste the Raw URL in docs and issues.',
      example: 'curl …/raw/payload',
    },
    {
      title: 'Cross-device clipboard',
      body: 'Write on a laptop, open on a phone. No account — one URL is the current text.',
      example: 'phone → /note or /raw',
    },
  ],
  faqs: [
    {
      q: 'What is PlainNote?',
      a: 'An anonymous, login-free lightweight note service. Write once, get three links: private edit, Markdown web view, and Raw plaintext (text/plain).',
    },
    {
      q: 'Do I need to register?',
      a: 'No. No signup, no login, no subscription. Access is entirely link-based.',
    },
    {
      q: 'How does the edit link work?',
      a: 'The URL embeds a secret. Whoever holds it can update or delete; lost secrets cannot be recovered. Keep it private.',
    },
    {
      q: 'How do the three links differ?',
      a: 'Read-only renders Markdown for people; Raw returns plaintext for curl / scripts / LLMs; the edit link stays with the maintainer.',
    },
    {
      q: 'How long are notes kept?',
      a: 'Forever by default (while the service and database stay up). Local history lives only in browser localStorage and does not affect the server.',
    },
  ],

  editDefaultTitle: 'Edit note',
  editWarn:
    '⚠ Keep the edit URL in the address bar safe. It is the only credential to update or delete; lost links cannot be recovered.',
  editWarnDismiss: 'Got it',
  editWarnDismissAria: 'Dismiss warning',
  titlePlaceholder: 'Title (optional)',
  shareIdEditTitle: (id) => `Edit share id ${id}`,
  shareIdUpdatedToast: '✓ Share id updated',
  copyNoteLink: 'Copy web link',
  copyRawLink: 'Copy Raw link',
  download: 'Download',
  downloadMd: 'Download .md',
  downloadTxt: 'Download .txt',
  deleteNote: 'Delete note',
  saveChanges: 'Save changes',
  saving: 'Saving…',
  savedToast: '✓ Saved',
  leaveUnsavedConfirm: 'You have unsaved changes. Leave and create a new note?',
  editLinkInvalid: 'Edit link is invalid. The note may have been deleted.',
  saveFailed: 'Save failed. Please try again.',
  copiedNoteLinkToast: 'Web link copied',
  copiedRawLinkToast: 'Raw link copied',
  deleteConfirmTitle: 'Delete this note?',
  deleteConfirmBody:
    'After deletion, the edit, web, and Raw links all stop working and cannot be restored. This cannot be undone.',
  deleteConfirmBtn: 'Delete',
  deleting: 'Deleting…',
  deletedToast: 'Note deleted',
  deleteFailed: 'Delete failed. Please try again.',
  shareIdModalTitle: 'Edit share id',
  shareIdModalDesc: (min, max) =>
    `The share id appears in the web and Raw URLs (e.g. <code>/note/your-id</code>). Letters, digits, and hyphens only; length ${min}–${max}. After a successful change, old share links stop working immediately.`,
  shareIdModalLabel: 'New share id',
  shareIdConfirm: 'Update',
  shareIdEmpty: 'Share id cannot be empty',
  shareIdLen: (min, max) => `Length must be ${min}–${max} characters`,
  shareIdCharset: 'Only letters, digits, and hyphens (-) are allowed',
  saveAsNew: 'Save as new note',
  editNotFound: 'Note not found, or the edit link is invalid / deleted.',
  loadFailed: 'Failed to load. Check your network and try again.',

  updatedAt: (time, formatLabel) => `Updated: ${time} · ${formatLabel}`,
  openRaw: 'View raw text',
  noteNotFound: 'Note not found, or the link is invalid / deleted.',

  errorLoadFailedCode: 'Load failed',
  errorHintNotFound:
    'For an edit link, make sure it is complete and not truncated; lost links cannot be recovered.<br/>For a web / Raw link, the author may have deleted the note.',
  errorHintLoadFailed: 'Check your network connection or try again later.',
  retry: 'Retry',
  backHome: 'Back home to write a new note',

  apiTitle: 'API',
  apiLead:
    'HTTP API for anonymous notes. Create once and get an edit link, a read-only web link, and a Raw plaintext link — ready for curl, scripts, and LLMs.',
  apiConventionsTitle: 'Conventions',
  apiConventions: [
    'Base URL: current instance <code>{{origin}}</code>',
    'Write requests / responses: <code>application/json; charset=utf-8</code>',
    'Auth: edit secret <code>secret</code> (24 chars) in the URL path; no Cookie / Authorization',
    '<code>id</code> (10 chars) is read-only only; read endpoints never return <code>secret</code>',
    'Title ≤ 200 chars (optional); body 1–30,000 chars (Unicode code points); title/body must not contain sensitive terms',
  ],
  apiLinksTitle: 'Three links',
  apiLinksColLink: 'Link',
  apiLinksColPath: 'Path',
  apiLinksColAccess: 'Access',
  apiLinkEdit: 'Edit',
  apiLinkEditAccess: 'Holder can update / delete',
  apiLinkNote: 'Read-only web',
  apiLinkNoteAccess: 'Anyone, read-only',
  apiLinkRaw: 'Raw',
  apiLinkRawAccess: 'Plaintext for programs',
  apiSectionTitle: 'Endpoints',
  apiPostCreate: 'Create a note. Returns NoteFull (includes secret and three links).',
  apiGetBySecret: 'Load the full note by edit secret (editor bootstrap).',
  apiGetPublic: 'Read a public note. Returns NotePublic without secret.',
  apiPatch: 'Update title and/or body (at least one field required).',
  apiDelete: 'Permanently delete the note; all three links stop working.',
  apiRaw: 'Return raw Markdown as plaintext (no HTML rendering).',
  apiRawNote: 'Success Content-Type is text/plain; errors are also plaintext (not JSON).',
  apiErrorsTitle: 'Errors',
  apiErrorsLead: 'JSON endpoints share one error shape:',
  apiErrorSample: `{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Content cannot be empty",
    "fields": { "content": "Content is required" }
  }
}`,
  apiErrorsColHttp: 'HTTP',
  apiErrorsColCode: 'code',
  apiErrorsColDesc: 'Meaning',
  apiErrors: [
    { http: '400', code: 'BAD_REQUEST', desc: 'Invalid JSON / no updatable fields' },
    { http: '404', code: 'NOTE_NOT_FOUND', desc: 'Missing note or wrong secret (same message)' },
    { http: '422', code: 'VALIDATION_FAILED', desc: 'Empty body, over length, sensitive words, etc.' },
    { http: '429', code: 'RATE_LIMITED', desc: 'Create rate limit exceeded (per IP)' },
    { http: '500', code: 'INTERNAL_ERROR', desc: 'Server error' },
  ],
  apiCreateCurlBody: `{"title":"Title","content":"Content to share"}`,
  apiPatchCurlBody: `{"content":"Updated content"}`,
  apiResponseLabel: 'Response example',
  apiCreateResponse: `{
  "id": "a1b2c3d4e5",
  "secret": "AbCdEfGhIjKlMnOpQrStUvWx",
  "title": "Title",
  "content": "Content to share",
  "format": "text",
  "createdAt": 1735689600000,
  "updatedAt": 1735689600000,
  "editUrl": "{{origin}}/edit/AbCdEfGhIjKlMnOpQrStUvWx",
  "noteUrl": "{{origin}}/note/a1b2c3d4e5",
  "rawUrl": "{{origin}}/raw/a1b2c3d4e5"
}`,
};

const MESSAGES: Record<Lang, Messages> = { zh: ZH, en: EN };

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch {
    // ignore
  }
  // Default to English; Chinese requires an explicit language switch.
  return 'en';
}

let currentLang: Lang = detectLang();

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }
}

/** Docs/API page path for a language (EN `/docs`, ZH `/zh/docs`). */
export function docsPath(lang: Lang = currentLang): string {
  return lang === 'zh' ? '/zh/docs' : '/docs';
}

/** Resolve language from a docs URL path, or null if not a docs route. */
export function langFromDocsPath(pathname: string): Lang | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/zh/docs') return 'zh';
  if (path === '/docs') return 'en';
  return null;
}

export function t(): Messages {
  return MESSAGES[currentLang];
}

/** Apply stored/detected lang to <html lang> on first load. */
export function applyDocumentLang(): void {
  document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function langSwitchHtml(): string {
  const lang = currentLang;
  const m = t();
  return `
    <div class="lang-switch" role="group" aria-label="${escapeHtml(m.langSwitchLabel)}">
      <button type="button" class="lang-switch-btn${lang === 'zh' ? ' is-active' : ''}" data-lang="zh" aria-pressed="${lang === 'zh' ? 'true' : 'false'}">中文</button>
      <button type="button" class="lang-switch-btn${lang === 'en' ? ' is-active' : ''}" data-lang="en" aria-pressed="${lang === 'en' ? 'true' : 'false'}">EN</button>
    </div>
  `;
}

/** Wire language toggle buttons; calls onChange after a real language change. */
export function bindLangSwitch(root: ParentNode, onChange: () => void): void {
  root.querySelectorAll<HTMLButtonElement>('.lang-switch-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next: Lang = btn.dataset.lang === 'en' ? 'en' : 'zh';
      if (next === getLang()) return;
      setLang(next);
      onChange();
    });
  });
}
