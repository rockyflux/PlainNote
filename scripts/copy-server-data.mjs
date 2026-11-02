import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src', 'server', 'data', 'sensitive.txt');
const destDir = join(root, 'dist', 'server', 'data');
const dest = join(destDir, 'sensitive.txt');

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`copied ${src} -> ${dest}`);
