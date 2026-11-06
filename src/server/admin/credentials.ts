import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const PASSWORD_FILE_NAME = 'admin.password';
const GENERATED_BYTES = 24;

export interface AdminCredentials {
  /** 明文管理口令（仅存于本机文件 / 进程内，不入日志）。 */
  password: string;
  /** 口令文件绝对路径。 */
  path: string;
  /** 本次启动是否新生成并写入了口令。 */
  generated: boolean;
}

function passwordFilePath(dbPath: string): string {
  return join(dirname(resolve(dbPath)), PASSWORD_FILE_NAME);
}

function generatePassword(): string {
  return randomBytes(GENERATED_BYTES).toString('base64url');
}

function writePasswordFile(path: string, password: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${password}\n`, { encoding: 'utf8', mode: 0o600, flag: 'w' });
  try {
    chmodSync(path, 0o600);
  } catch {
    // Windows 等平台可能忽略 chmod，不影响功能。
  }
}

function readPasswordFile(path: string): string | null {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf8').trim();
  return raw.length > 0 ? raw : null;
}

/**
 * 解析管理口令：
 * 1. CLI/环境变量显式传入 → 写入口令文件并使用
 * 2. 口令文件已存在 → 读取复用
 * 3. 否则首次生成并落盘
 */
export function resolveAdminCredentials(options: {
  dbPath: string;
  passwordOverride?: string;
}): AdminCredentials {
  const path = passwordFilePath(options.dbPath);
  const override = options.passwordOverride?.trim();

  if (override) {
    writePasswordFile(path, override);
    return { password: override, path, generated: false };
  }

  const existing = readPasswordFile(path);
  if (existing) {
    return { password: existing, path, generated: false };
  }

  const password = generatePassword();
  writePasswordFile(path, password);
  return { password, path, generated: true };
}
