import { timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { AppError, ErrorCode } from '../http/errors.js';

/** 常量时间比较两个字符串（长度不同时也安全失败）。 */
export function safeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // 仍做一次比较，避免纯长度分支泄露；结果恒为 false。
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/** 从 Authorization: Bearer <token> 提取口令。 */
export function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (typeof header !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

export function assertAdminPassword(request: FastifyRequest, expected: string): void {
  const provided = extractBearerToken(request);
  if (!provided || !safeEqualString(provided, expected)) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, '管理口令无效或未提供');
  }
}

/** 简易登录限流：按 IP 滑动窗口。 */
export class LoginRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number,
  ) {}

  assertAllowed(ip: string | null): void {
    const key = ip ?? 'unknown';
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.maxAttempts) {
      const retryAfter = Math.max(
        1,
        Math.ceil((this.windowMs - (now - recent[0])) / 1000),
      );
      throw new AppError(
        429,
        ErrorCode.RATE_LIMITED,
        `登录尝试过于频繁，请 ${retryAfter} 秒后再试`,
        undefined,
        retryAfter,
      );
    }
    recent.push(now);
    this.hits.set(key, recent);
  }

  clear(ip: string | null): void {
    this.hits.delete(ip ?? 'unknown');
  }
}
