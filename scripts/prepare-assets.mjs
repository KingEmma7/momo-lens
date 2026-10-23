import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length, 0);
  name.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([name, data])), output.length - 4);
  return output;
}
function iconPng(size, maskable = false) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const scale = size / 512;
  // A simple original lens mark, drawn directly as a raster for install icons.
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const px = x / scale;
      const py = y / scale;
      const margin = maskable ? 30 : 0;
      const white =
        (px >= 126 + margin && px <= 170 + margin && py >= 183 && py <= 333) ||
        (px >= 285 - margin && px <= 329 - margin && py >= 183 && py <= 333) ||
        (py >= 183 && py <= 290 && Math.abs(Math.abs(px - 228) - (290 - py) * 0.68) < 20);
      const yellow =
        (px - 350) ** 2 + (py - 170) ** 2 <= 34 ** 2 ||
        (px > 368 && px < 402 && Math.abs(py - px + 170) < 11);
      const colour = yellow ? [20, 20, 20] : white ? [20, 20, 20] : [255, 255, 255];
      const offset = y * (size * 4 + 1) + x * 4 + 1;
      raw[offset] = colour[0];
      raw[offset + 1] = colour[1];
      raw[offset + 2] = colour[2];
      raw[offset + 3] = 255;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

if (process.argv.includes('--precache')) {
  const out = path.join(root, 'out');
  async function walk(directory) {
    const paths = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) paths.push(...(await walk(absolute)));
      else paths.push(path.relative(out, absolute).split(path.sep).join('/'));
    }
    return paths;
  }
  const files = (await walk(out)).filter(
    (file) =>
      !file.endsWith('.map') && !['precache.json', 'sw.js', '_headers', '404.html'].includes(file),
  );
  const urls = files.map((file) => `/${file.endsWith('index.html') ? file.slice(0, -10) : file}`);
  await writeFile(
    path.join(out, 'precache.json'),
    `${JSON.stringify([...new Set(urls)].sort())}\n`,
  );
  const source = await readFile(path.join(out, 'sw.js'), 'utf8');
  const hash = createHash('sha256');
  hash.update(
    source.replace(/const CACHE_NAME = '[^']+';/, "const CACHE_NAME = 'momo-lens-build';"),
  );
  for (const file of [...files].sort()) {
    hash.update(file);
    hash.update(await readFile(path.join(out, file)));
  }
  const fingerprint = hash.digest('hex').slice(0, 16);
  await writeFile(
    path.join(out, 'sw.js'),
    source.replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = 'momo-lens-${fingerprint}';`),
  );
} else {
  const pdfPath = require.resolve('pdfjs-dist/build/pdf.worker.min.mjs');
  await mkdir(path.join(root, 'public/icons'), { recursive: true });
  await copyFile(pdfPath, path.join(root, 'public/pdf.worker.min.mjs'));
  await writeFile(path.join(root, 'public/icons/icon-192.png'), iconPng(192));
  await writeFile(path.join(root, 'public/icons/icon-512.png'), iconPng(512));
  await writeFile(path.join(root, 'public/icons/maskable-512.png'), iconPng(512, true));
}
