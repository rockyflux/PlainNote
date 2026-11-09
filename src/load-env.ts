import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Load KEY=VALUE pairs from a .env file into process.env (without overriding
 * already-set variables). Minimal parser — no dependency on dotenv.
 */
export function loadEnvFile(filePath = '.env'): void {
  const absolute = resolve(filePath);
  if (!existsSync(absolute)) return;

  const text = readFileSync(absolute, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined) continue;

    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
