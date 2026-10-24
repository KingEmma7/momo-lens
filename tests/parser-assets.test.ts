import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const entry = '/_next/static/chunks/momo-lens-private-parser.synthetic.js';
const chunk = '/_next/static/chunks/123.synthetic.js';
let blobs: Blob[];
let revoke: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.resetModules();
  blobs = [];
  vi.stubGlobal('window', {
    location: { origin: 'https://synthetic.invalid' },
    addEventListener: vi.fn(),
  });
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    blobs.push(blob as Blob);
    return `blob:synthetic-${blobs.length}`;
  });
  revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('loads only build-listed local scripts once and reuses two bounded blobs until release', async () => {
  const fetch = vi.fn(async (url: string) =>
    url.endsWith('parser-assets.json')
      ? new Response(JSON.stringify({ entry, chunks: [chunk, entry] }))
      : new Response(url === entry ? 'self.entryLoaded=true;' : 'self.chunkLoaded=true;'),
  );
  vi.stubGlobal('fetch', fetch);
  const { prepareParserAssets, releaseParserAssets } = await import('../lib/parser-assets');
  const first = await prepareParserAssets();
  expect(await prepareParserAssets()).toBe(first);
  expect(fetch.mock.calls.map(([url]) => url)).toEqual([
    '/_next/static/parser-assets.json',
    chunk,
    entry,
    '/pdf.worker.min.mjs',
  ]);
  expect(blobs).toHaveLength(2);
  expect(await blobs[1]?.text()).toContain('self.chunkLoaded=true;');
  expect(await blobs[1]?.text()).toContain('self.entryLoaded=true;');
  expect(await blobs[1]?.text()).not.toContain('nativeImportScripts');
  releaseParserAssets();
  expect(revoke).toHaveBeenCalledTimes(2);
});
it.each([
  'https://example.com/remote.js',
  '/_next/static/chunks/../remote.js',
  '/private-data.js',
  '/_next/static/chunks/file.js?statement=synthetic',
])('rejects an untrusted manifest path %s before loading code', async (bad) => {
  const fetch = vi.fn(async () => new Response(JSON.stringify({ entry: bad, chunks: [bad] })));
  vi.stubGlobal('fetch', fetch);
  const { prepareParserAssets } = await import('../lib/parser-assets');
  await expect(prepareParserAssets()).rejects.toThrow('Invalid local parser chunk paths.');
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(blobs).toHaveLength(0);
});
it('retries a failed asset fetch without retaining partial blobs', async () => {
  const fetch = vi.fn(async (url: string) =>
    url.endsWith('parser-assets.json')
      ? new Response(JSON.stringify({ entry, chunks: [entry] }))
      : new Response('synthetic', { status: url.endsWith('.mjs') ? 503 : 200 }),
  );
  vi.stubGlobal('fetch', fetch);
  const { prepareParserAssets } = await import('../lib/parser-assets');
  await expect(prepareParserAssets()).rejects.toThrow('Local parser assets are unavailable.');
  await expect(prepareParserAssets()).rejects.toThrow('Local parser assets are unavailable.');
  expect(fetch).toHaveBeenCalledTimes(6);
  expect(blobs).toHaveLength(0);
});

it('bounds each fetch by 25 seconds and permits retry after an aborted fetch', async () => {
  const signals: AbortSignal[] = [];
  const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => {
    const controller = new AbortController();
    signals.push(controller.signal);
    queueMicrotask(() => controller.abort(new DOMException('Synthetic timeout', 'TimeoutError')));
    return controller.signal;
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => reject(options.signal?.reason), {
            once: true,
          });
        }),
    ),
  );
  const { prepareParserAssets } = await import('../lib/parser-assets');
  await expect(prepareParserAssets()).rejects.toMatchObject({ name: 'TimeoutError' });
  await expect(prepareParserAssets()).rejects.toMatchObject({ name: 'TimeoutError' });
  expect(timeout.mock.calls).toEqual([[25_000], [25_000]]);
  expect(signals).toHaveLength(2);
  expect(blobs).toHaveLength(0);
});
