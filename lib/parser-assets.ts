interface ParserAssets {
  entry: string;
  pdf: string;
}
let assets: Promise<ParserAssets> | undefined;
const blobUrls = new Set<string>();
function blobUrl(source: string): string {
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  blobUrls.add(url);
  return url;
}
export function releaseParserAssets(): void {
  for (const url of blobUrls) URL.revokeObjectURL(url);
  blobUrls.clear();
  assets = undefined;
}
async function text(url: string): Promise<string> {
  const response = await fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error('Local parser assets are unavailable.');
  return response.text();
}
/** Keep public application code in memory so terminated workers can restart without fetching. */
export function prepareParserAssets(): Promise<ParserAssets> {
  assets ??= (async () => {
    const response = await fetch('/_next/static/parser-assets.json', {
      credentials: 'omit',
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) throw new Error('Local parser manifest is unavailable.');
    const manifest: unknown = await response.json();
    if (
      !manifest ||
      typeof manifest !== 'object' ||
      !('entry' in manifest) ||
      !('chunks' in manifest) ||
      typeof manifest.entry !== 'string' ||
      !Array.isArray(manifest.chunks)
    )
      throw new Error('Invalid local parser manifest.');
    const chunks: unknown[] = manifest.chunks;
    if (
      chunks.length === 0 ||
      chunks.length > 50 ||
      !chunks.includes(manifest.entry) ||
      !chunks.every(
        (url): url is string =>
          typeof url === 'string' && /^\/_next\/static\/chunks\/[a-zA-Z0-9_.-]+\.js$/.test(url),
      )
    )
      throw new Error('Invalid local parser chunk paths.');
    const sources = await Promise.all(chunks.map(async (url) => [url, await text(url)] as const));
    const source = sources.find(([url]) => url === manifest.entry)?.[1];
    if (!source) throw new Error('The parser entry is empty.');
    // Each webpack chunk registers module factories. Include those trusted build chunks
    // directly in the worker script so importScripts needs neither network nor relaxed CSP.
    const dependencies = sources
      .filter(([url]) => url !== manifest.entry)
      .map(([url, code]) => `${JSON.stringify(url)}:()=>{\n${code}\n}`)
      .join(',');
    const bootstrap = `const localChunks={${dependencies}};self.importScripts=(...urls)=>{for(const value of urls){const url=new URL(String(value),${JSON.stringify(window.location.origin)});if(url.origin!==${JSON.stringify(window.location.origin)}||!Object.hasOwn(localChunks,url.pathname))throw new Error('Unlisted parser asset');localChunks[url.pathname]();}};\n`;
    const pdf = blobUrl(await text('/pdf.worker.min.mjs'));
    return { entry: blobUrl(bootstrap + source), pdf };
  })().catch((error: unknown) => {
    releaseParserAssets();
    throw error;
  });
  return assets;
}
if (typeof window !== 'undefined')
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) releaseParserAssets();
  });
