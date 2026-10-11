#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'src-cli', 'bpm4b.ts');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bpm4b-cli-smoke-'));
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true, ...options });
  if (result.error) throw result.error;
  return result;
};
const cliRun = (...args) => {
  const result = run(process.execPath, ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', '--experimental-strip-types', cli, ...args]);
  assert.equal(result.status, 0, `bpm4b ${args[0] ?? ''} failed:\n${result.stdout}\n${result.stderr}`);
  return result;
};
const pass = (label) => console.log(`PASS ${label}`);
const assertFile = (file) => assert.ok(fs.existsSync(file) && fs.statSync(file).size > 128, `Expected output file: ${file}`);

try {
  cliRun('--help'); pass('CLI help');
  cliRun('--version'); pass('CLI version');

  const book = path.join(temp, 'book with spaces.txt');
  fs.writeFileSync(book, 'Chapter 1: First\n\nText one.\n\nChapter 2: Second\n\nText two.\n', 'utf8');
  assert.match(cliRun('detect', book).stdout, /2 section\(s\)/); pass('detect');
  assert.match(cliRun('split', book).stdout, /First[\s\S]*Second/); pass('split');

  const inputA = path.join(temp, 'audio one.wav');
  const inputB = path.join(temp, 'audio two.wav');
  for (const [file, hz] of [[inputA, '440'], [inputB, '660']]) {
    const generated = run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', `sine=frequency=${hz}:duration=2`, '-c:a', 'pcm_s16le', '-y', file]);
    assert.equal(generated.status, 0, `Couldn't create fixture audio; ensure FFmpeg is installed (${generated.stderr})`);
    assertFile(file);
  }
  pass('generate sample audio');

  const m4bTitles = path.join(temp, 'titles.m4b');
  cliRun('m4b', '-i', `${inputA},${inputB}`, '-o', m4bTitles, '-t', 'First,Second');
  assertFile(m4bTitles); pass('m4b --titles');

  const m4bTimestamps = path.join(temp, 'timestamps.m4b');
  cliRun('m4b', '-i', inputA, '-o', m4bTimestamps, '-c', 'Opening@00:00:00,Second@00:00:01');
  assertFile(m4bTimestamps); pass('m4b --chapters timestamps');

  const extracted = path.join(temp, 'extracted.mp3');
  cliRun('extract', inputA, extracted, '--bitrate', '192k');
  assertFile(extracted); pass('extract');

  const merged = path.join(temp, 'merged.wav');
  cliRun('merge', '-i', `${inputA},${inputB}`, '-o', merged);
  assertFile(merged); pass('merge');
  console.log(`CLI smoke run passed. Temporary fixtures: ${temp}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (process.exitCode === 0) fs.rmSync(temp, { recursive: true, force: true });
}
