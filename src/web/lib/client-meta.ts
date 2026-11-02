/** 浏览器侧元数据：创建笔记时随请求一并提交（IP 由服务端解析）。 */

export function clientTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz?.trim() ? tz.trim().slice(0, 64) : null;
  } catch {
    return null;
  }
}

export function clientLanguage(): string | null {
  const lang = typeof navigator !== 'undefined' ? navigator.language?.trim() : '';
  return lang ? lang.slice(0, 32) : null;
}
