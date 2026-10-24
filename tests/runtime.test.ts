import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ParseResult, Transaction } from '../lib/parsers/types';

const mocks = vi.hoisted(() => {
  const saved = new Map<string, unknown>();
  const metadata = new Map<string, unknown>();
  const db = {
    get: vi.fn(async (_store: string, key: string) => saved.get(key)),
    put: vi.fn(async (_store: string, value: unknown, key: string) => {
      saved.set(key, value);
    }),
    delete: vi.fn(async (_store: string, key: string) => {
      saved.delete(key);
    }),
    clear: vi.fn(async () => {
      saved.clear();
    }),
    close: vi.fn(),
    transaction: vi.fn(),
  };
  db.transaction.mockImplementation(() => ({
    objectStore: (store: string) =>
      store === 'metadata'
        ? {
            get: async (key: string) => metadata.get(key),
            put: async (value: unknown, key: string) => {
              metadata.set(key, value);
            },
          }
        : {
            get: (key: string) => db.get(store, key),
            put: (value: unknown, key: string) => db.put(store, value, key),
            delete: (key: string) => db.delete(store, key),
            clear: () => db.clear(),
          },
    done: Promise.resolve(),
  }));
  return {
    metadata,
    saved,
    db,
    openDB: vi.fn(async () => db),
    getDocument: vi.fn(),
    detectAndParse: vi.fn(),
    pdfDestroy: vi.fn(async () => undefined),
    pdfCleanup: vi.fn(),
    expose: vi.fn(),
  };
});
vi.mock('idb', () => ({ openDB: mocks.openDB }));
vi.mock('comlink', () => ({ expose: mocks.expose }));
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  PDFWorker: class {
    promise = Promise.resolve();
    static create() {
      return new this();
    }
  },
  getDocument: mocks.getDocument,
}));
vi.mock('../lib/parsers/registry', () => ({ detectAndParse: mocks.detectAndParse }));

const result: ParseResult = {
  transactions: [],
  session: {
    id: 'synthetic-import',
    fileName: 'synthetic.csv',
    provider: 'mtn-gh',
    periodStart: '',
    periodEnd: '',
    parsedCount: 0,
    skippedRows: [],
    warnings: [],
  },
};

beforeEach(() => {
  vi.resetModules();
  mocks.saved.clear();
  mocks.metadata.clear();
  mocks.openDB.mockReset().mockResolvedValue(mocks.db);
  mocks.db.get
    .mockReset()
    .mockImplementation(async (store: string, key: string) =>
      (store === 'metadata' ? mocks.metadata : mocks.saved).get(key),
    );
  mocks.db.put
    .mockReset()
    .mockImplementation(async (_store: string, value: unknown, key: string) => {
      mocks.saved.set(key, value);
    });
  mocks.db.clear.mockReset().mockImplementation(async () => {
    mocks.saved.clear();
  });
  mocks.db.delete.mockReset().mockImplementation(async (_store: string, key: string) => {
    mocks.saved.delete(key);
  });
  mocks.getDocument.mockReset();
  mocks.detectAndParse.mockReset().mockImplementation(async () => structuredClone(result));
  mocks.pdfDestroy.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('private storage', () => {
  it('defaults to memory and never stores personal data before opt-in', async () => {
    const storage = await import('../lib/storage');
    const state = await storage.readData();
    expect(state.settings.rememberOnDevice).toBe(false);
    expect(state.settings.hideAmountsInShare).toBe(true);
    expect(state.settings.hideNamesInShare).toBe(true);
    await storage.saveData(state);
    expect(mocks.db.put).not.toHaveBeenCalled();
    expect(mocks.db.delete).toHaveBeenCalledWith('private', 'private-data');
  });

  it('saves opted-in data, restores rules and clears every private record', async () => {
    let storage = await import('../lib/storage');
    const state = await storage.readData();
    state.settings.rememberOnDevice = true;
    state.rules.push({
      id: 'r1',
      match: { counterparty: 'Synthetic Person' },
      categoryId: 'bills',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    await storage.saveData(state);
    vi.resetModules();
    storage = await import('../lib/storage');
    const restored = await storage.readData();
    expect(restored.rules[0]?.id).toBe('r1');
    expect(restored.settings.rememberOnDevice).toBe(true);
    await storage.clearData();
    expect(mocks.saved.size).toBe(0);
    expect((await storage.readData()).rules).toEqual([]);
    expect((await storage.readData()).settings.rememberOnDevice).toBe(false);
  });

  it('falls back to a private in-memory session when IndexedDB is blocked', async () => {
    mocks.openDB.mockRejectedValue(new DOMException('Unavailable', 'SecurityError'));
    const storage = await import('../lib/storage');
    expect((await storage.readData()).notice).toContain('session only');
    const state = await storage.readData();
    state.settings.rememberOnDevice = true;
    const notice = await storage.saveData(state);
    expect(notice).toContain('could not save');
    expect((await storage.readData()).settings.rememberOnDevice).toBe(false);
  });

  it('preserves session data and reports a full storage quota', async () => {
    mocks.db.put.mockRejectedValueOnce(new DOMException('Full', 'QuotaExceededError'));
    const storage = await import('../lib/storage');
    const state = await storage.readData();
    state.settings.rememberOnDevice = true;
    const transaction = { id: 't1', amount: 2500 } as Transaction;
    state.transactions = [transaction];
    expect(await storage.saveData(state)).toContain('out of storage');
    expect((await storage.readData()).transactions[0]?.id).toBe('t1');
  });

  it('returns independent snapshots and removes previous persistence on opt-out', async () => {
    const storage = await import('../lib/storage');
    const state = await storage.readData();
    state.settings.rememberOnDevice = true;
    await storage.saveData(state);
    state.rules.push({
      id: 'late',
      match: { type: 'airtime' },
      categoryId: 'other',
      createdAt: '',
    });
    expect((await storage.readData()).rules).toEqual([]);
    state.settings.rememberOnDevice = false;
    await storage.saveData(state);
    expect(mocks.saved.size).toBe(0);
  });

  it('clears the current session when browser storage is unavailable and reports disk uncertainty', async () => {
    mocks.openDB.mockRejectedValue(new DOMException('Unavailable', 'SecurityError'));
    const storage = await import('../lib/storage');
    const state = await storage.readData();
    state.rules.push({
      id: 'session-rule',
      match: { type: 'airtime' },
      categoryId: 'other',
      createdAt: '',
    });
    await storage.saveData(state);
    expect((await storage.readData()).rules).toHaveLength(1);
    expect(await storage.clearData()).toContain('could not confirm removal');
    expect((await storage.readData()).rules).toEqual([]);
    expect((await storage.readData()).transactions).toEqual([]);
  });

  it('shares an in-flight initial read rather than returning an empty second snapshot', async () => {
    const storage = await import('../lib/storage');
    const saved = {
      transactions: [],
      settings: { ...storage.DEFAULT_SETTINGS, rememberOnDevice: true },
      rules: [
        { id: 'persisted-rule', match: { type: 'airtime' }, categoryId: 'other', createdAt: '' },
      ],
    };
    let release: (value: unknown) => void = () => undefined;
    mocks.db.get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const firstRead = storage.readData();
    const secondRead = storage.readData();
    await vi.waitFor(() => expect(mocks.db.get).toHaveBeenCalledTimes(1));
    release(saved);
    const [first, second] = await Promise.all([firstRead, secondRead]);
    expect(first.rules[0]?.id).toBe('persisted-rule');
    expect(second.rules[0]?.id).toBe('persisted-rule');
  });

  it.each(['delete', 'opt-out'] as const)(
    'serialises an older opt-in write before %s',
    async (action) => {
      const storage = await import('../lib/storage');
      const state = await storage.readData();
      state.settings.rememberOnDevice = true;
      let release: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      mocks.db.put.mockImplementationOnce(async (_store: string, value: unknown, key: string) => {
        await gate;
        mocks.saved.set(key, value);
      });
      const pendingSave = storage.saveData(state);
      await vi.waitFor(() => expect(mocks.db.put).toHaveBeenCalledTimes(1));
      const removal =
        action === 'delete'
          ? storage.clearData()
          : storage.saveData({
              ...state,
              settings: { ...state.settings, rememberOnDevice: false },
            });
      release();
      await Promise.all([pendingSave, removal]);
      expect(mocks.saved.size).toBe(0);
      expect((await storage.readData()).settings.rememberOnDevice).toBe(false);
    },
  );

  it('reports an unverifiable saved copy when opting out cannot remove it', async () => {
    const storage = await import('../lib/storage');
    const state = await storage.readData();
    state.settings.rememberOnDevice = true;
    await storage.saveData(state);
    mocks.db.delete.mockRejectedValueOnce(new DOMException('Blocked', 'SecurityError'));
    state.settings.rememberOnDevice = false;
    expect(await storage.saveData(state)).toContain('could not confirm removal');
    expect(mocks.saved.size).toBe(1);
    expect((await storage.readData()).settings.rememberOnDevice).toBe(false);
  });

  it('does not restore a late initial read after the user clears data', async () => {
    const storage = await import('../lib/storage');
    let release: (value: unknown) => void = () => undefined;
    mocks.db.get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const pendingRead = storage.readData();
    await vi.waitFor(() => expect(mocks.db.get).toHaveBeenCalledTimes(1));
    const removal = storage.clearData();
    release({
      transactions: [],
      settings: { ...storage.DEFAULT_SETTINGS, rememberOnDevice: true },
      rules: [{ id: 'old-rule', match: {}, categoryId: 'other', createdAt: '' }],
    });
    await Promise.all([pendingRead, removal]);
    expect((await storage.readData()).rules).toEqual([]);
  });
});

describe('local parsing worker', () => {
  it('loads the local PDF worker before allowing parsing and reuses it', async () => {
    const created: string[] = [];
    class LocalWorker extends EventTarget {
      constructor(url: string) {
        super();
        created.push(url);
        queueMicrotask(() => {
          this.dispatchEvent(new MessageEvent('message', { data: { action: 'ready' } }));
        });
      }
      terminate(): void {
        /* The production worker is released when its owner closes. */
      }
    }
    vi.stubGlobal('Worker', LocalWorker);
    const worker = await import('../workers/parse.worker');
    await worker.warm();
    await worker.warm();
    expect(created).toEqual(['/pdf.worker.min.mjs']);
  });

  it('decodes UTF-8 and non-UTF8 CSV without a server', async () => {
    const worker = await import('../workers/parse.worker');
    const utf8 = new TextEncoder().encode('Date,Description\n1/1/2026,Café');
    expect(worker.decodeCsv(utf8.buffer).legacyEncoding).toBe(false);
    const legacy = Uint8Array.from([67, 97, 102, 233]);
    expect(worker.decodeCsv(legacy.buffer)).toEqual({ text: 'Café', legacyEncoding: true });
    const response = await worker.parse({ name: 'legacy.csv', bytes: legacy.buffer });
    expect(response.ok).toBe(true);
    if (response.ok) expect(response.result.session.warnings[0]).toContain('Windows-1252');
  });

  it('rejects oversized, empty and unsupported inputs', async () => {
    const worker = await import('../workers/parse.worker');
    expect(await worker.parse({ name: 'x.xlsx', bytes: new ArrayBuffer(1) })).toMatchObject({
      ok: false,
      code: 'UNSUPPORTED_FILE',
    });
    expect(await worker.parse({ name: 'x.csv', bytes: new ArrayBuffer(0) })).toMatchObject({
      ok: false,
      code: 'EMPTY_FILE',
    });
    expect(
      await worker.parse({ name: 'x.csv', bytes: new ArrayBuffer(25 * 1024 * 1024 + 1) }),
    ).toMatchObject({ ok: false, code: 'FILE_TOO_LARGE' });
  });

  it('prompts locally for a password and reports incorrect passwords', async () => {
    const worker = await import('../workers/parse.worker');
    const error = new Error('private message never exposed');
    error.name = 'PasswordException';
    mocks.getDocument.mockImplementation(() => ({
      promise: Promise.reject(error),
      destroy: mocks.pdfDestroy,
    }));
    const bytes = new ArrayBuffer(8);
    expect(await worker.parse({ name: 'protected.pdf', bytes })).toMatchObject({
      ok: false,
      code: 'PASSWORD_REQUIRED',
    });
    expect(
      await worker.parse({ name: 'protected.pdf', bytes, password: 'local-only' }),
    ).toMatchObject({ ok: false, code: 'PASSWORD_INCORRECT' });
    expect(mocks.pdfDestroy).toHaveBeenCalledTimes(2);
  });

  it('explains image-only PDFs and releases PDF memory', async () => {
    const worker = await import('../workers/parse.worker');
    mocks.getDocument.mockImplementation(() => ({
      promise: Promise.resolve({
        numPages: 1,
        getPage: async () => ({
          getTextContent: async () => ({ items: [] }),
          cleanup: mocks.pdfCleanup,
        }),
        destroy: mocks.pdfDestroy,
      }),
      destroy: mocks.pdfDestroy,
    }));
    expect(await worker.parse({ name: 'scan.pdf', bytes: new ArrayBuffer(8) })).toMatchObject({
      ok: false,
      code: 'IMAGE_ONLY',
    });
    expect(mocks.pdfDestroy).toHaveBeenCalled();
  });

  it('groups columns and multiple pages before passing only text to parsers', async () => {
    const worker = await import('../workers/parse.worker');
    const items = [
      { str: 'MTN MoMo Statement', transform: [1, 0, 0, 1, 10, 700], width: 140, hasEOL: true },
      { str: '01/01/2026', transform: [1, 0, 0, 1, 10, 680], width: 60, hasEOL: false },
      { str: 'Airtime', transform: [1, 0, 0, 1, 100, 680], width: 50, hasEOL: false },
      { str: '10.00', transform: [1, 0, 0, 1, 200, 680], width: 40, hasEOL: true },
    ];
    mocks.getDocument.mockImplementation(() => ({
      promise: Promise.resolve({
        numPages: 2,
        getPage: async () => ({
          getTextContent: async () => ({ items }),
          cleanup: mocks.pdfCleanup,
        }),
        destroy: mocks.pdfDestroy,
      }),
      destroy: mocks.pdfDestroy,
    }));
    const progress: number[] = [];
    const response = await worker.parse(
      { name: 'two-pages.pdf', bytes: new ArrayBuffer(8) },
      (value) => progress.push(value),
    );
    expect(response.ok).toBe(true);
    expect(mocks.detectAndParse.mock.calls[0]?.[0]).toMatchObject({
      kind: 'pdf',
      text: expect.stringContaining('01/01/2026  Airtime  10.00'),
    });
    expect(progress.at(-1)).toBe(100);
    expect(mocks.pdfCleanup).toHaveBeenCalled();
    expect(mocks.getDocument.mock.calls[0]?.[0]).toMatchObject({
      useWasm: false,
      useWorkerFetch: false,
    });
  });

  it('never exposes provider data in an unexpected parsing error', async () => {
    const worker = await import('../workers/parse.worker');
    mocks.detectAndParse.mockRejectedValue(new Error('Synthetic private name should be hidden'));
    const response = await worker.parse({
      name: 'x.csv',
      bytes: new TextEncoder().encode('private sample').buffer,
    });
    expect(response).toMatchObject({ ok: false, code: 'PARSE_FAILED' });
    expect(JSON.stringify(response)).not.toContain('Synthetic private name');
  });
});
