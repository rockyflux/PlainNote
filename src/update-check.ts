import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';

const FETCH_TIMEOUT_MS = 2500;
const PROMPT_TIMEOUT_MS = 15_000;

/** 比较两个 x.y.z 版本；latest > current 时返回 true。无法解析则视为无需更新。 */
export function isNewerVersion(latest: string, current: string): boolean {
  const a = parseSemver(latest);
  const b = parseSemver(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

function parseSemver(raw: string): [number, number, number] | null {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(raw.trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function shouldSkipUpdateCheck(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.PLAINNOTE_NO_UPDATE === '1' || env.PLAINSHARE_NO_UPDATE === '1') return true;
  if (env.CI === 'true' || env.CI === '1') return true;
  if (env.npm_config_update_notifier === 'false') return true;
  return false;
}

/** 查询 npm latest；失败/超时返回 null，不影响启动。 */
export async function fetchLatestVersion(
  packageName: string,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: unknown };
    return typeof data.version === 'string' ? data.version : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function canPrompt(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/** TTY 下询问 y/N；超时或非交互返回 false。 */
export function askYesNo(question: string, timeoutMs = PROMPT_TIMEOUT_MS): Promise<boolean> {
  if (!canPrompt()) return Promise.resolve(false);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      rl.close();
      resolve(value);
    };

    const timer = setTimeout(() => {
      process.stdout.write('\n');
      finish(false);
    }, timeoutMs);

    rl.question(question, (answer) => {
      finish(/^\s*y(es)?\s*$/i.test(answer));
    });
  });
}

/** 用 npx 拉起 @latest 并继承当前参数；返回子进程退出码。 */
export function relaunchWithLatest(packageName: string, args: string[]): number {
  const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(npxBin, ['--yes', `${packageName}@latest`, ...args], {
    stdio: 'inherit',
    env: { ...process.env, PLAINNOTE_NO_UPDATE: '1' },
    windowsHide: true,
  });
  if (result.error) {
    console.error(`Failed to relaunch update: ${result.error.message}`);
    console.error(`Please run manually: npx ${packageName}@latest`);
    return 1;
  }
  return result.status ?? 1;
}

export type UpdateCheckResult = 'continue' | 'exited';

/**
 * 启动前检测 npm 是否有更新版本。
 * - 交互终端：询问是否用最新版重启（y 则 npx @latest 并退出当前进程）
 * - 非交互：仅打印提示后继续
 */
export async function maybeOfferUpdate(options: {
  packageName: string;
  currentVersion: string;
  argv: string[];
  skip?: boolean;
}): Promise<UpdateCheckResult> {
  if (options.skip || shouldSkipUpdateCheck()) return 'continue';

  const latest = await fetchLatestVersion(options.packageName);
  if (!latest || !isNewerVersion(latest, options.currentVersion)) return 'continue';

  console.log(
    `Update available: ${latest} (current ${options.currentVersion}). Run: npx ${options.packageName}@latest`,
  );

  if (!canPrompt()) return 'continue';

  const yes = await askYesNo('Relaunch with the latest version now? [y/N] ');
  if (!yes) {
    console.log('Skipped update; continuing with the current version.');
    return 'continue';
  }

  console.log(`Starting ${options.packageName}@${latest}…`);
  process.exit(relaunchWithLatest(options.packageName, options.argv));
}
