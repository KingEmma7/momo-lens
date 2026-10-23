import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('out');
async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? filesIn(path.join(directory, entry.name))
        : [path.join(directory, entry.name)],
    ),
  );
  return files.flat();
}
function policy(hashes, includeFrameAncestors) {
  return [
    "default-src 'self'",
    `script-src 'self' 'wasm-unsafe-eval' ${[...hashes].join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    ...(includeFrameAncestors ? ["frame-ancestors 'none'"] : []),
  ].join('; ');
}
const allHashes = new Set();
let pages = 0;
for (const file of await filesIn(root)) {
  if (!file.endsWith('.html')) continue;
  let html = await readFile(file, 'utf8');
  const hashes = new Set();
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(match[1]) || !match[2]) continue;
    const hash = `'sha256-${createHash('sha256').update(match[2], 'utf8').digest('base64')}'`;
    hashes.add(hash);
    allHashes.add(hash);
  }
  const csp = policy(hashes, false).replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}"/>`;
  if (!/<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*>/i.test(html))
    throw new Error(`Missing CSP meta in ${path.relative(root, file)}`);
  html = html.replace(/<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*>/gi, '');
  html = html.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}${meta}`);
  await writeFile(file, html);
  pages += 1;
}
const headerLines = await readFile(path.resolve('public/_headers'), 'utf8');
const strictHeaders = headerLines.replace(
  /^\s*Content-Security-Policy:.*$/m,
  `  Content-Security-Policy: ${policy(allHashes, true)}`,
);
await writeFile(path.join(root, '_headers'), strictHeaders);
await writeFile(path.join(root, 'csp-policy.txt'), `${policy(allHashes, true)}\n`);
// Vercel may resolve repository headers before a build starts. Its source header is
// deliberately broader than the per-page generated meta policy; both apply and
// the browser enforces their intersection. Cloudflare reads out/_headers directly.
console.log(`Added exact inline-script CSP hashes to ${pages} static pages.`);
