#!/usr/bin/env node
import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir, networkInterfaces } from 'node:os';
import { join, resolve } from 'node:path';
import { loadEnvFile } from './load-env.js';
import { resolveAdminCredentials } from './server/admin/credentials.js';
import { createServer } from './server/index.js';
import { defaultStaticDir } from './server/routes/static.js';
import { maybeOfferUpdate } from './update-check.js';

loadEnvFile();

const DEFAULT_PORT = 3123;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_DB = join(homedir(), '.plainnote', 'plainnote.db');
/** Empty string = use packaged default lexicon path. */
const DEFAULT_SENSITIVE = '';

const require = createRequire(import.meta.url);
const pkgJson = require('../package.json') as { name: string; version: string };
const pkg = { name: pkgJson.name, version: pkgJson.version };

function parsePort(raw: string | undefined): number {
  const port = Number(raw ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`Error: port must be an integer 1–65535, got ${raw}`);
    process.exit(1);
  }
  return port;
}

/** Non-loopback IPv4 addresses for LAN URLs printed at startup. */
function lanIPv4Addresses(): string[] {
  const addresses: string[] = [];
  for (const entries of Object.values(networkInterfaces())) {
    if (!entries) continue;
    for (const net of entries) {
      // Node 18+ runtime may use numeric 4; typings often use 'IPv4'
      if (String(net.family) !== 'IPv4' && String(net.family) !== '4') continue;
      if (!net.internal) addresses.push(net.address);
    }
  }
  return addresses;
}

function formatStartupError(error: unknown): string {
  if (error instanceof Error) {
    if (
      error.message.includes('Database file could not be opened or is corrupted') ||
      error.message.includes('Turso database could not be initialized') ||
      error.message.includes('TURSO_AUTH_TOKEN is required')
    ) {
      return error.message;
    }
    return `Failed to start: ${error.message}`;
  }
  return `Failed to start: ${String(error)}`;
}

async function main(): Promise<void> {
  const program = new Command();

  program
    .name('plainnote')
    .description('Anonymous Markdown notes with a web view and a curl-friendly raw link.')
    .version(pkg.version)
    .option('-p, --port <n>', `Listen port (default ${DEFAULT_PORT})`, process.env.PORT ?? String(DEFAULT_PORT))
    .option(
      '-H, --host <addr>',
      `Bind address (default ${DEFAULT_HOST}, includes LAN; use 127.0.0.1 for localhost only)`,
      process.env.HOST ?? DEFAULT_HOST,
    )
    .option('-d, --db <path>', `SQLite database path (default ${DEFAULT_DB})`, process.env.DB_PATH ?? DEFAULT_DB)
    .option(
      '--sensitive <path>',
      'Sensitive-word lexicon path (default: packaged server/data/sensitive.txt)',
      process.env.SENSITIVE_PATH ?? DEFAULT_SENSITIVE,
    )
    .option(
      '--admin-password <pwd>',
      'Set admin password and write it to admin.password next to the DB',
      process.env.ADMIN_PASSWORD,
    )
    .option(
      '--show-admin-password',
      'Print the existing admin password on startup (printed by default only when first generated)',
    )
    .option('--no-update-check', 'Skip npm update check')
    .parse(process.argv);

  const options = program.opts<{
    port: string;
    host: string;
    db: string;
    sensitive: string;
    adminPassword?: string;
    showAdminPassword?: boolean;
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
    console.error(`Failed to start: frontend static directory not found: ${staticDir}`);
    console.error('Run npm run build, or ensure the plainshare package includes dist/static.');
    process.exit(1);
  }

  const admin = resolveAdminCredentials({
    dbPath,
    passwordOverride: options.adminPassword,
  });
  const server = await createServer({
    dbPath,
    staticDir,
    sensitivePath,
    adminPassword: admin?.password,
  });

  await server.app.listen({ host, port });

  const listenAll = host === '0.0.0.0' || host === '::';
  const localUrl = `http://${listenAll ? '127.0.0.1' : host}:${port}`;
  // Only print LAN URLs when bound to all interfaces.
  const networkIps = listenAll ? lanIPv4Addresses() : [];

  console.log('PlainNote running');
  console.log(`  Local:   ${localUrl}`);
  for (const ip of networkIps) {
    console.log(`  Network: http://${ip}:${port}`);
  }
  console.log(
    server.storeKind === 'turso'
      ? `  DB:      Turso (${server.storeLabel})`
      : `  DB:      ${server.storeLabel}`,
  );
  if (sensitivePath) console.log(`  Sensitive: ${sensitivePath}`);
  console.log(`  Admin:   ${localUrl}/admin`);
  if (!admin) {
    console.log('  Admin password: (disabled — set ADMIN_PASSWORD or use local first-run file)');
  } else {
    console.log(`  Admin password file: ${admin.path}`);
    if (admin.generated || options.showAdminPassword) {
      console.log(`  Admin password: ${admin.password}`);
      if (admin.generated) {
        console.log('  (First-time password — save it; later startups hide it by default)');
      }
    } else {
      console.log(
        '  Admin password: (hidden — use --show-admin-password or read the password file)',
      );
    }
  }
  if (listenAll) {
    console.warn(
      '  ⚠ Bound to all interfaces: anyone who can reach this host can create/read notes. Prefer a trusted network.',
    );
  }
  console.log('  Press Ctrl+C to stop');

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down…`);
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
