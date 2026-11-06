#!/usr/bin/env node
import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir, networkInterfaces } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from './server/index.js';
import { defaultStaticDir } from './server/routes/static.js';
import { maybeOfferUpdate } from './update-check.js';

const DEFAULT_PORT = 3123;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_DB = join(homedir(), '.plainnote', 'plainnote.db');
/** 空字符串表示使用包内默认词库路径。 */
const DEFAULT_SENSITIVE = '';

const require = createRequire(import.meta.url);
const pkgJson = require('../package.json') as { name: string; version: string };
const pkg = { name: pkgJson.name, version: pkgJson.version };

function parsePort(raw: string | undefined): number {
  const port = Number(raw ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`错误：端口必须是 1–65535 的整数，收到 ${raw}`);
    process.exit(1);
  }
  return port;
}

/** 本机非回环 IPv4，用于启动时打印局域网访问地址。 */
function lanIPv4Addresses(): string[] {
  const addresses: string[] = [];
  for (const entries of Object.values(networkInterfaces())) {
    if (!entries) continue;
    for (const net of entries) {
      // Node 18+ 运行时可能是数字 4；类型定义多为 'IPv4'
      if (String(net.family) !== 'IPv4' && String(net.family) !== '4') continue;
      if (!net.internal) addresses.push(net.address);
    }
  }
  return addresses;
}

function formatStartupError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('数据库文件无法打开或已损坏')) {
      return error.message;
    }
    return `启动失败：${error.message}`;
  }
  return `启动失败：${String(error)}`;
}

async function main(): Promise<void> {
  const program = new Command();

  program
    .name('plainnote')
    .description('Anonymous Markdown notes with a web view and a curl-friendly raw link.')
    .version(pkg.version)
    .option('-p, --port <n>', `监听端口（默认 ${DEFAULT_PORT}）`, process.env.PORT ?? String(DEFAULT_PORT))
    .option('-H, --host <addr>', `监听地址（默认 ${DEFAULT_HOST}，含局域网；仅本机用 127.0.0.1）`, process.env.HOST ?? DEFAULT_HOST)
    .option('-d, --db <path>', `SQLite 数据库文件路径（默认 ${DEFAULT_DB}）`, process.env.DB_PATH ?? DEFAULT_DB)
    .option(
      '--sensitive <path>',
      '敏感词库文件路径（默认使用包内 server/data/sensitive.txt）',
      process.env.SENSITIVE_PATH ?? DEFAULT_SENSITIVE,
    )
    .option('--no-update-check', '跳过 npm 版本更新检测')
    .parse(process.argv);

  const options = program.opts<{
    port: string;
    host: string;
    db: string;
    sensitive: string;
    updateCheck: boolean;
  }>();

  await maybeOfferUpdate({
    packageName: pkg.name,
    currentVersion: pkg.version,
    argv: process.argv.slice(2).filter((arg) => arg !== '--no-update-check'),
    skip: options.updateCheck === false,
  });

  const port = parsePort(options.port);
  const host = options.host || DEFAULT_HOST;
  const dbPath = resolve(options.db || DEFAULT_DB);
  const sensitivePath = options.sensitive?.trim() ? resolve(options.sensitive.trim()) : undefined;
  const staticDir = defaultStaticDir();
  if (!existsSync(staticDir)) {
    console.error(`启动失败：前端静态目录不存在：${staticDir}`);
    console.error('请确认已执行 npm run build，或安装的 plainshare 包包含 dist/static。');
    process.exit(1);
  }

  const server = createServer({ dbPath, staticDir, sensitivePath });

  await server.app.listen({ host, port });

  const listenAll = host === '0.0.0.0' || host === '::';
  const localUrl = `http://${listenAll ? '127.0.0.1' : host}:${port}`;
  // 仅在对外监听时打印局域网地址，避免 127.0.0.1 绑定时误导为可访问。
  const networkIps = listenAll ? lanIPv4Addresses() : [];

  console.log('PlainNote running');
  console.log(`  Local:   ${localUrl}`);
  for (const ip of networkIps) {
    console.log(`  Network: http://${ip}:${port}`);
  }
  console.log(`  DB:      ${dbPath}`);
  if (sensitivePath) console.log(`  Sensitive: ${sensitivePath}`);
  if (listenAll) {
    console.warn(
      '  ⚠ 当前已监听全部网卡对外暴露，任何可访问本机的人都能创建/读取笔记，请确认网络环境可信。',
    );
  }
  console.log('  Press Ctrl+C to stop');

  const shutdown = async (signal: string) => {
    console.log(`\n收到 ${signal}，正在关闭…`);
    try {
      await server.close();
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error(formatStartupError(error));
  process.exit(1);
});
