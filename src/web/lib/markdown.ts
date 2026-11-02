import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true, async: false });

// 白名单标签：不包含 img（本期不支持图片）、不包含 script/iframe/style 等。
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

/** 将 Markdown 渲染为经过白名单清洗的安全 HTML；无代码高亮、无 Mermaid。 */
export function renderMarkdown(source: string): string {
  const rawHtml = marked.parse(source) as string;
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'title', 'rel', 'target'],
    ALLOWED_URI_REGEXP: /^(https?:|mailto:)/i,
  });
}
