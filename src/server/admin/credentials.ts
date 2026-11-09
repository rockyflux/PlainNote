import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const PASSWORD_FILE_NAME = 'admin.password';
const GENERATED_BYTES = 24;

export interface AdminCredentials {
  /** 明文管理口令（仅存于本机文件 / 进程内 / 环境变量，不入日志）。 */
  password: string;
  /** 口令文件绝对路径；环境变量模式为 `(env)`。 */
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

export function isServerlessRuntime(): boolean {
  return process.env.VERCEL === '1' || process.env.PLAINNOTE_EPHEMERAL_ADMIN === '1';
}

/**
 * 解析管理口令：
 * - Serverless / ephemeral：只用环境变量或显式传入，不读写 admin.password
 * - 本地：
 *   1. CLI/环境变量显式传入 → 写入口令文件并使用
 *   2. 口令文件已存在 → 读取复用
 *   3. 否则首次生成并落盘
 *
 * 返回 null 表示未配置管理口令（不注册管理 API）。
 */
export function resolveAdminCredentials(options: {
  dbPath: string;
  passwordOverride?: string;
  /** Skip filesystem; require passwordOverride or return null. */
  ephemeral?: boolean;
}): AdminCredentials | null {
  const ephemeral = options.ephemeral === true || isServerlessRuntime();
  const override = options.passwordOverride?.trim();

  if (ephemeral) {
    if (!override) return null;
    return { password: override, path: '(env)', generated: false };
  }

  const path = passwordFilePath(options.dbPath);

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
