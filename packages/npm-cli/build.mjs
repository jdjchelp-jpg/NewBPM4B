import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const pkg = path.dirname(fileURLToPath(import.meta.url));
mkdirSync(path.join(pkg, 'dist'), { recursive: true });
const esbuild = path.join(root, 'node_modules', 'esbuild', 'bin', 'esbuild');
const result = spawnSync(process.execPath, [esbuild,
  path.join(pkg, 'src-cli', 'bpm4b.ts'), '--bundle', '--platform=node',
  '--format=esm', '--packages=external', '--outfile=' + path.join(pkg, 'dist', 'bpm4b.js')
], { stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
copyFileSync(path.join(pkg, 'launcher.mjs'), path.join(pkg, 'dist', 'launcher.mjs'));
