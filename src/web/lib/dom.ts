/** 简易 DOM 辅助与通用前端工具。 */

export function codeLength(text: string): number {
  return [...text].length;
}

export function formatTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 非安全上下文降级：临时 textarea 选中复制
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(ta);
    }
  }
}

let toastTimer: number | undefined;
export function toast(message: string): void {
  let node = document.getElementById('toast');
  if (!node) {
    node = document.createElement('div');
    node.id = 'toast';
    document.body.appendChild(node);
  }
  node.textContent = message;
  node.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => node?.classList.remove('show'), 1800);
}

export function downloadNote(
  title: string | null,
  content: string,
  format: 'text' | 'markdown' = 'markdown',
): void {
  const safe = (title || 'plainnote').replace(/[\\/:*?"<>|]/g, '-').slice(0, 60);
  const ext = format === 'text' ? 'txt' : 'md';
  const mime = format === 'text' ? 'text/plain;charset=utf-8' : 'text/markdown;charset=utf-8';
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** @deprecated 使用 downloadNote */
export function downloadMarkdown(title: string | null, content: string): void {
  downloadNote(title, content, 'markdown');
}
