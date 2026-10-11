import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'build-resources');
const source = path.join(root, 'BPM4B Icon.png');
const png = path.join(output, 'icon.png');
execFileSync('magick', [source, '-resize', '1024x1024', png], { stdio: 'inherit' });
execFileSync('magick', [png, '-define', 'icon:auto-resize=256,128,64,48,32,16', path.join(output, 'icon.ico')], { stdio: 'inherit' });

const chunks = [];
for (const [size, type] of [[16, 'icp4'], [32, 'icp5'], [64, 'icp6'], [128, 'ic07'], [256, 'ic08'], [512, 'ic09'], [1024, 'ic10']]) {
  const image = path.join(output, `icon-${size}.png`);
  execFileSync('magick', [png, '-resize', `${size}x${size}`, image], { stdio: 'inherit' });
  const data = fs.readFileSync(image);
  const header = Buffer.alloc(8);
  header.write(type, 0, 4, 'ascii');
  header.writeUInt32BE(data.length + 8, 4);
  chunks.push(header, data);
  fs.unlinkSync(image);
}
const contents = Buffer.concat(chunks);
const icns = Buffer.alloc(8);
icns.write('icns', 0, 4, 'ascii');
icns.writeUInt32BE(contents.length + 8, 4);
fs.writeFileSync(path.join(output, 'icon.icns'), Buffer.concat([icns, contents]));
console.log('Generated icon.png, icon.ico, and icon.icns from BPM4B Icon.png.');
