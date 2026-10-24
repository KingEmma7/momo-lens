import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

it('stages an offline update without taking over an open statement session', async () => {
  const events = new Map<
    string,
    (event: { waitUntil: (pending: Promise<void>) => void }) => void
  >();
  const skipWaiting = vi.fn();
  const addAll = vi.fn(async () => undefined);
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self: {
      addEventListener: (
        name: string,
        listener: (event: { waitUntil: (pending: Promise<void>) => void }) => void,
      ) => events.set(name, listener),
      skipWaiting,
    },
    fetch: async () => ({ ok: true, json: async () => ['/', '/import/'] }),
    caches: { open: async () => ({ addAll }) },
  });
  let installed: Promise<void> | undefined;
  events.get('install')?.({
    waitUntil: (pending) => {
      installed = pending;
    },
  });
  await installed;
  expect(addAll).toHaveBeenCalledWith(['/', '/import/']);
  expect(skipWaiting).not.toHaveBeenCalled();
});

it('changes the emitted worker fingerprint when an application asset changes', async () => {
  const { mkdtemp, mkdir, writeFile, readFile, copyFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execute = promisify(execFile);
  const directory = await mkdtemp(path.join(tmpdir(), 'momo-lens-update-test-'));
  try {
    await mkdir(path.join(directory, 'scripts'));
    await mkdir(path.join(directory, 'out'));
    await copyFile(
      'scripts/prepare-assets.mjs',
      path.join(directory, 'scripts/prepare-assets.mjs'),
    );
    await copyFile('public/sw.js', path.join(directory, 'out/sw.js'));
    await writeFile(path.join(directory, 'out/index.html'), '<h1>Version one</h1>');
    await execute(process.execPath, [
      path.join(directory, 'scripts/prepare-assets.mjs'),
      '--precache',
    ]);
    const first = await readFile(path.join(directory, 'out/sw.js'), 'utf8');
    await writeFile(path.join(directory, 'out/index.html'), '<h1>Version two</h1>');
    await execute(process.execPath, [
      path.join(directory, 'scripts/prepare-assets.mjs'),
      '--precache',
    ]);
    const second = await readFile(path.join(directory, 'out/sw.js'), 'utf8');
    expect(first).not.toEqual(second);
    expect(JSON.parse(await readFile(path.join(directory, 'out/precache.json'), 'utf8'))).toEqual([
      '/',
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
