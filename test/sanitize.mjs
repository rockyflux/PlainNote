/**
 * 前端 Markdown 渲染安全校验（与 src/web/lib/markdown.ts 的白名单配置保持一致）。
 * 在 Node + jsdom 下验证：<script> 被剥离、javascript: 链接被移除、合法内容保留。
 * 运行：node test/sanitize.mjs
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
// 先挂载全局 window/document，再让 dompurify 默认实例完成初始化。
globalThis.window = dom.window;
globalThis.document = dom.window.document;

const { marked } = await import('marked');
const { default: DOMPurify } = await import('dompurify');

marked.setOptions({ gfm: true, breaks: true, async: false });

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'a', 'ul', 'ol', 'li', 'blockquote',
  'code', 'pre', 'strong', 'em', 'del', 's',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'br', 'span', 'sub', 'sup',
];

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer');
    node.setAttribute('target', '_blank');
  }
});

function renderMarkdown(source) {
  const rawHtml = marked.parse(source);
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'title', 'rel', 'target'],
    ALLOWED_URI_REGEXP: /^(https?:|mailto:)/i,
  });
}

let pass = 0;
let fail = 0;
const assert = (name, condition) => {
  if (condition) { console.log(`PASS  ${name}`); pass += 1; }
  else { console.log(`FAIL  ${name}`); fail += 1; }
};

const malicious = [
  '# 标题\n',
  '<a href="javascript:alert(1)">恶意链接</a>\n',
  '<script>alert("xss")</script>\n',
  '[合法链接](https://example.com)\n',
  '- 列表项一\n- 列表项二\n',
  '普通 **加粗** 文字\n',
].join('\n');

const html = renderMarkdown(malicious);

assert('不残留 <script> 标签', !/<script/i.test(html));
assert('不残留 alert( 执行代码', !/alert\(/.test(html));
assert('javascript: 链接被移除', !/javascript:/i.test(html));
assert('合法 https 链接保留', html.includes('https://example.com'));
assert('外链带上 rel=noopener', html.includes('noopener'));
assert('标题被渲染为 h1', /<h1>标题<\/h1>/.test(html));
assert('无序列表被保留', /<ul>/.test(html) && html.includes('列表项一'));
assert('加粗被保留', /<strong>加粗<\/strong>/.test(html));
assert('普通文本保留', html.includes('普通'));

// 额外：img / iframe / style 不应出现在白名单产物中
const attack = renderMarkdown(
  '<img src=x onerror=alert(1)>\n<iframe src="https://evil"></iframe>\n<style>body{display:none}</style>',
);
assert('img onerror 被剥离', !/onerror/i.test(attack) && !/<img/i.test(attack));
assert('iframe 被剥离', !/<iframe/i.test(attack));
assert('style 标签被剥离', !/<style/i.test(attack));

console.log(`\nPASS=${pass} FAIL=${fail}`);
process.exit(fail === 0 ? 0 : 1);
