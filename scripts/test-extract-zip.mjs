import assert from 'node:assert/strict';
import { constants } from 'node:fs';
import { lstat, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

// Exercise the exact transitive extractor used by Lighthouse's browser installer.
const require = createRequire(import.meta.url);
const lhci = createRequire(require.resolve('@lhci/cli/package.json'));
const lighthouse = createRequire(lhci.resolve('lighthouse'));
const puppeteer = createRequire(lighthouse.resolve('puppeteer-core'));
const browsers = createRequire(puppeteer.resolve('@puppeteer/browsers'));
const extract = browsers('extract-zip');
const regular = 0o100644;
const link = 0o120777;

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Tiny, uncompressed synthetic archives avoid a ZIP writer dependency or binary fixtures.
function zip(entries) {
  const local = [];
  const central = [];
  let offset = 0;
  for (const [name, text, mode = regular] of entries) {
    const filename = Buffer.from(name);
    const bytes = Buffer.from(text);
    const checksum = crc32(bytes);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt32LE(checksum, 14);
    header.writeUInt32LE(bytes.length, 18);
    header.writeUInt32LE(bytes.length, 22);
    header.writeUInt16LE(filename.length, 26);
    local.push(header, filename, bytes);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50);
    directory.writeUInt16LE((3 << 8) | 20, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt32LE(checksum, 16);
    directory.writeUInt32LE(bytes.length, 20);
    directory.writeUInt32LE(bytes.length, 24);
    directory.writeUInt16LE(filename.length, 28);
    directory.writeUInt32LE((mode << 16) >>> 0, 38);
    directory.writeUInt32LE(offset, 42);
    central.push(directory, filename);
    offset += header.length + filename.length + bytes.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

async function fixture(run) {
  const root = await mkdtemp(path.join(tmpdir(), 'momo-extract-regression-'));
  const dir = path.join(root, 'extracted');
  const outside = path.join(root, 'outside');
  await mkdir(dir);
  await mkdir(outside);
  await writeFile(path.join(outside, 'sentinel'), 'unchanged');
  try {
    await run({
      root,
      dir,
      outside,
      async unpack(entries, options = {}) {
        const archive = path.join(root, 'synthetic.zip');
        await writeFile(archive, zip(entries));
        await extract(archive, { dir, ...options });
      },
    });
    assert.equal(await readFile(path.join(outside, 'sentinel'), 'utf8'), 'unchanged');
    await assert.rejects(lstat(path.join(outside, 'newdir')), {
      code: 'ENOENT',
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

for (const [label, entries, output] of [
  [
    'forward framework chain',
    [
      ['Versions/Current', 'A', link],
      ['Binary', 'Versions/Current/Binary', link],
      ['Versions/A/Binary', 'hello'],
    ],
    'Binary',
  ],
  ['ordinary file and directory', [['folder/file', 'hello']], 'folder/file'],
  ['executable file', [['tool', 'hello', 0o100755]], 'tool'],
  [
    'internal symlink',
    [
      ['folder/file', 'hello'],
      ['alias', 'folder/file', link],
    ],
    'alias',
  ],
  [
    'internal parent-relative symlink',
    [
      ['folder/file', 'hello'],
      ['folder/sub/alias', '../file', link],
    ],
    'folder/sub/alias',
  ],
  [
    'framework symlink chain',
    [
      ['Versions/A/Binary', 'hello'],
      ['Versions/Current', 'A', link],
      ['Binary', 'Versions/Current/Binary', link],
    ],
    'Binary',
  ],
  [
    'duplicate ordinary file',
    [
      ['file', 'old'],
      ['file', 'hello'],
    ],
    'file',
  ],
]) {
  test(`preserves ${label}`, () =>
    fixture(async ({ dir, unpack }) => {
      await unpack(entries);
      assert.equal(await readFile(path.join(dir, output), 'utf8'), 'hello');
      if (label === 'executable file' && process.platform !== 'win32')
        assert.notEqual((await stat(path.join(dir, output))).mode & 0o111, 0);
    }));
}

for (const [label, getEntries, preexisting] of [
  ['dangling existing target', () => [['new-link', 'escape/subdir', link]], 'dangling'],
  ['existing symlink cycle', () => [['new-link', 'escape/subdir', link]], 'cycle'],
  ['self-referencing link', () => [['escape', 'escape', link]]],
  ['relative escaping target', () => [['escape', '../outside/sentinel', link]]],
  ['absolute escaping target', ({ outside }) => [['escape', path.join(outside, 'sentinel'), link]]],
  ['Windows drive target', () => [['escape', 'C:\\outside\\sentinel', link]]],
  ['sibling-prefix target', () => [['escape', '../extracted-other/sentinel', link]]],
  [
    'duplicate write through symlink',
    () => [
      ['escape', '../outside/sentinel', link],
      ['escape', 'overwrite'],
    ],
  ],
  [
    'write below planted symlink',
    () => [
      ['escape', '../outside', link],
      ['escape/newdir/payload', 'overwrite'],
    ],
  ],
  ['existing parent symlink', () => [['escape/newdir/payload', 'overwrite']], 'directory'],
  ['existing final symlink', () => [['escape', 'overwrite']], 'file'],
  ['indirect existing target', () => [['new-link', 'escape/sentinel', link]], 'directory'],
]) {
  test(`rejects ${label}`, () =>
    fixture(async (state) => {
      const { dir, unpack } = state;
      if (preexisting) {
        const target =
          preexisting === 'file'
            ? '../outside/sentinel'
            : preexisting === 'dangling'
              ? '../outside/missing'
              : preexisting === 'cycle'
                ? 'other'
                : '../outside';
        await symlink(target, path.join(dir, 'escape'));
        if (preexisting === 'cycle') await symlink('escape', path.join(dir, 'other'));
      }
      await assert.rejects(unpack(getEntries(state)));
      if (!preexisting)
        await assert.rejects(lstat(path.join(dir, 'escape')), {
          code: 'ENOENT',
        });
      await assert.rejects(lstat(path.join(dir, 'new-link')), {
        code: 'ENOENT',
      });
    }));
}

test(
  'does not follow a final symlink inserted after the path check',
  {
    skip: !constants.O_NOFOLLOW
      ? 'Platform does not expose O_NOFOLLOW; Windows runtime is not verified.'
      : false,
  },
  () =>
    fixture(async ({ dir, outside, unpack }) => {
      // The public hook runs after the first path check and before opening the output file.
      const { symlinkSync } = await import('node:fs');
      await assert.rejects(
        unpack([['late-link', 'overwrite']], {
          onEntry() {
            symlinkSync(path.join(outside, 'sentinel'), path.join(dir, 'late-link'));
          },
        }),
      );
    }),
);
