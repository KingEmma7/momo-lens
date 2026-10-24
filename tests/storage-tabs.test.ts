import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('indexedDB', new IDBFactory());
});

it('prevents a stale tab from restoring deleted transactions, rules and settings', async () => {
  const tabA = await import('../lib/storage');
  const saved = await tabA.readData();
  saved.settings.rememberOnDevice = true;
  saved.rules = [
    {
      id: 'synthetic-rule',
      match: { counterparty: 'Synthetic Person' },
      categoryId: 'bills',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];
  await tabA.saveData(saved);
  vi.resetModules();
  const tabB = await import('../lib/storage');
  const stale = await tabB.readData();
  expect(stale.rules).toHaveLength(1);
  await tabA.clearData();
  stale.settings.hideAmountsInShare = false;
  await tabB.saveData(stale);
  vi.resetModules();
  const reloaded = await import('../lib/storage');
  const restored = await reloaded.readData();
  expect(restored.rules).toEqual([]);
  expect(restored.transactions).toEqual([]);
  expect(restored.settings.rememberOnDevice).toBe(false);
});

it('upgrades version-one saved referenced rows without duplicating a subsequent import', async () => {
  const { openDB } = await import('idb');
  const legacy = await openDB('momo-lens-private', 1, {
    upgrade(db) {
      db.createObjectStore('private');
    },
  });
  const { parseTable } = await import('../lib/parsers/common');
  const imported = parseTable(
    {
      name: 'mtn.csv',
      kind: 'csv',
      text: 'Date,Description,Amount,Transaction ID\n01/09/2026,Transfer to 0241111001,-10,SYN-MIGRATE-1',
    },
    'mtn-gh',
  ).transactions[0];
  if (!imported) throw new Error('Synthetic transaction missing.');
  expect(imported.counterpartyKey).toBeTypeOf('string');
  await legacy.put(
    'private',
    {
      transactions: [
        { ...imported, id: 'legacy-reference-hash', categoryId: 'bills', categorySource: 'user' },
      ],
      rules: [],
      settings: {
        rememberOnDevice: true,
        hideAmountsInShare: true,
        hideNamesInShare: true,
        locale: 'en',
      },
    },
    'private-data',
  );
  legacy.close();
  const storage = await import('../lib/storage');
  const restored = await storage.readData();
  expect(restored.transactions[0]?.id).toBe(imported.id);
  expect(restored.transactions[0]?.categoryId).toBe('bills');
  const { mergeImportedTransactions } = await import('../lib/identity');
  const merged = mergeImportedTransactions(
    restored.transactions.map((tx) => ({ ...tx, counterpartyKey: undefined })),
    [imported],
  );
  expect(merged.transactions).toHaveLength(1);
  expect(merged.duplicates).toBe(1);
  expect(merged.transactions[0]?.categorySource).toBe('user');
  expect(merged.transactions[0]?.counterpartyKey).toBe(imported.counterpartyKey);
});
