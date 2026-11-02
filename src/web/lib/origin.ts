/**
 * 浏览器对外公开 origin。
 * Host 带 :443（或误用 http://host:443）时输出 https://host，省略默认端口。
 */
export function publicOrigin(): string {
  const { protocol, hostname, port } = window.location;
  let scheme = protocol === 'https:' ? 'https' : 'http';

  if (port === '443') {
    scheme = 'https';
    return `${scheme}://${hostname}`;
  }
  if (port === '80') {
    return `http://${hostname}`;
  }
  // 非默认端口保留（如 :3000）
  if (port) {
    return `${scheme}://${hostname}:${port}`;
  }
  return `${scheme}://${hostname}`;
}
