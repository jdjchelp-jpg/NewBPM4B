#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('./bpm4b.ts', import.meta.url));
const child = spawn(process.execPath, ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', '--experimental-strip-types', cli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  windowsHide: true,
});

child.on('error', (error) => {
  console.error(`Could not start BPM4B CLI: ${error.message}`);
  process.exitCode = 1;
});
child.on('close', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
