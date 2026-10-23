import { openDB, type IDBPDatabase } from 'idb';
import type { Rule, Settings, Transaction } from './parsers/types';

export interface StoredData {
  transactions: Transaction[];
  rules: Rule[];
  settings: Settings;
  notice?: string;
}

export const DEFAULT_SETTINGS: Settings = {
  rememberOnDevice: false,
  hideAmountsInShare: true,
  hideNamesInShare: true,
  locale: 'en',
};

const DATABASE_NAME = 'momo-lens-private';
const DATABASE_VERSION = 1;
const DATA_KEY = 'private-data';
let memory: StoredData = emptyData();
let database: Promise<IDBPDatabase> | undefined;
let initialised = false;
let reading: Promise<void> | undefined;
let writeQueue: Promise<void> = Promise.resolve();
let revision = 0;

function emptyData(): StoredData {
  return { transactions: [], rules: [], settings: { ...DEFAULT_SETTINGS } };
}

function clone(data: StoredData): StoredData {
  return {
    transactions: data.transactions.map((transaction) => ({ ...transaction })),
    rules: data.rules.map((rule) => ({ ...rule, match: { ...rule.match } })),
    settings: { ...data.settings },
    ...(data.notice ? { notice: data.notice } : {}),
  };
}

function getDatabase(): Promise<IDBPDatabase> {
  if (!database) {
    database = openDB(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('private')) db.createObjectStore('private');
      },
      blocked() {
        memory.notice = 'Close other MoMo Lens tabs to finish saving on this device.';
      },
      blocking() {
        void database?.then((db) => db.close());
        database = undefined;
      },
    });
  }
  return database;
}

function storageNotice(error: unknown): string {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return 'This device is out of storage. Your data is available for this session only.';
  }
  return 'This browser could not save your data. Your data is available for this session only.';
}

function serialise<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation);
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

/** The database contains one private snapshot, written only after explicit opt-in. */
export async function readData(): Promise<StoredData> {
  if (initialised) return clone(memory);
  if (!reading) {
    const startedAt = revision;
    reading = (async () => {
      try {
        const db = await getDatabase();
        const stored = (await db.get('private', DATA_KEY)) as StoredData | undefined;
        if (startedAt === revision && stored?.settings.rememberOnDevice) {
          memory = {
            transactions: Array.isArray(stored.transactions) ? stored.transactions : [],
            rules: Array.isArray(stored.rules) ? stored.rules : [],
            settings: { ...DEFAULT_SETTINGS, ...stored.settings },
          };
        }
      } catch (error) {
        database = undefined;
        if (startedAt === revision) memory.notice = storageNotice(error);
      } finally {
        initialised = true;
        reading = undefined;
      }
    })();
  }
  await reading;
  return clone(memory);
}

export async function saveData(data: StoredData): Promise<string | undefined> {
  const snapshot = clone(data);
  delete snapshot.notice;
  memory = clone(snapshot);
  initialised = true;
  const currentRevision = ++revision;
  return serialise(async () => {
    try {
      const db = await getDatabase();
      if (snapshot.settings.rememberOnDevice) {
        await db.put('private', snapshot, DATA_KEY);
      } else {
        await db.delete('private', DATA_KEY);
      }
    } catch (error) {
      database = undefined;
      // A stale write cannot replace a newer session or its storage notice.
      if (currentRevision === revision) {
        memory.notice = snapshot.settings.rememberOnDevice
          ? storageNotice(error)
          : 'This session is kept in memory. This browser could not confirm removal of any earlier saved copy. Close other MoMo Lens tabs and try deleting all data again.';
        memory.settings.rememberOnDevice = false;
        return memory.notice;
      }
    }
    return undefined;
  });
}

/** Clears this session immediately. A warning preserves uncertainty about an inaccessible saved copy. */
export async function clearData(): Promise<string | undefined> {
  memory = emptyData();
  initialised = true;
  ++revision;
  return serialise(async () => {
    try {
      const db = await getDatabase();
      await db.clear('private');
      return undefined;
    } catch {
      database = undefined;
      return 'Your open session has been cleared. This browser could not confirm removal of any saved copy. Close other MoMo Lens tabs and try deleting again.';
    }
  });
}
