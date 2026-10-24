import { t } from './i18n/index';
import { openDB, type IDBPDatabase } from 'idb';
import type { Rule, Settings, Transaction } from './parsers/types';
import { migrateTransactions } from './identity';

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
const DATABASE_VERSION = 2;
const GENERATION_KEY = 'deletion-generation';
const DELETED_NOTICE = t('Data was deleted in another tab. This session has been cleared.');
let generation = '0';
let channel: BroadcastChannel | undefined;
const deletionListeners = new Set<() => void>();
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
        if (!db.objectStoreNames.contains('metadata')) db.createObjectStore('metadata');
      },
      blocked() {
        memory.notice = t('Close other MoMo Lens tabs to finish saving on this device.');
      },
      blocking() {
        void database?.then((db) => db.close());
        database = undefined;
      },
    });
  }
  return database;
}

function receiveDeletion(nextGeneration: string): void {
  generation = nextGeneration;
  memory = emptyData();
  initialised = true;
  ++revision;
  for (const listener of deletionListeners) listener();
}

export function onDataDeleted(listener: () => void): () => void {
  deletionListeners.add(listener);
  if (!channel && typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel('momo-lens-deletion');
      channel.addEventListener('message', (event: MessageEvent<unknown>) => {
        if (typeof event.data === 'string' && event.data !== generation)
          receiveDeletion(event.data);
      });
    } catch {
      // Atomic generation checks still prevent a stale tab from saving deleted data.
    }
  }
  return () => {
    deletionListeners.delete(listener);
  };
}

function storageNotice(error: unknown): string {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return t('This device is out of storage. Your data is available for this session only.');
  }
  return t('This browser could not save your data. Your data is available for this session only.');
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
        const transaction = db.transaction(['private', 'metadata'], 'readonly');
        void transaction.done.catch(() => undefined);
        const [stored, storedGeneration] = await Promise.all([
          transaction.objectStore('private').get(DATA_KEY) as Promise<StoredData | undefined>,
          transaction.objectStore('metadata').get(GENERATION_KEY) as Promise<string | undefined>,
        ]);
        await transaction.done;
        if (startedAt === revision) generation = storedGeneration ?? '0';
        if (startedAt === revision && stored?.settings.rememberOnDevice) {
          memory = {
            transactions: Array.isArray(stored.transactions)
              ? migrateTransactions(stored.transactions)
              : [],
            rules: Array.isArray(stored.rules) ? stored.rules : [],
            settings: {
              ...DEFAULT_SETTINGS,
              ...stored.settings,
              locale: stored.settings.locale === 'tw' ? 'tw' : 'en',
            },
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
  const snapshotGeneration = generation;
  const currentRevision = ++revision;
  return serialise(async () => {
    try {
      const db = await getDatabase();
      const transaction = db.transaction(['private', 'metadata'], 'readwrite');
      void transaction.done.catch(() => undefined);
      const storedGeneration = (await transaction.objectStore('metadata').get(GENERATION_KEY)) as
        string | undefined;
      if ((storedGeneration ?? '0') !== snapshotGeneration) {
        await transaction.done;
        receiveDeletion(storedGeneration ?? '0');
        return DELETED_NOTICE;
      }
      const store = transaction.objectStore('private');
      if (snapshot.settings.rememberOnDevice) {
        await store.put(snapshot, DATA_KEY);
      } else {
        await store.delete(DATA_KEY);
      }
      await transaction.done;
    } catch (error) {
      database = undefined;
      // A stale write cannot replace a newer session or its storage notice.
      if (currentRevision === revision) {
        memory.notice = snapshot.settings.rememberOnDevice
          ? storageNotice(error)
          : t(
              'This session is kept in memory. This browser could not confirm removal of any earlier saved copy. Close other MoMo Lens tabs and try deleting all data again.',
            );
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
      const nextGeneration = crypto.randomUUID();
      const transaction = db.transaction(['private', 'metadata'], 'readwrite');
      void transaction.done.catch(() => undefined);
      await Promise.all([
        transaction.objectStore('private').clear(),
        transaction.objectStore('metadata').put(nextGeneration, GENERATION_KEY),
      ]);
      await transaction.done;
      generation = nextGeneration;
      channel?.postMessage(nextGeneration);
      return undefined;
    } catch {
      database = undefined;
      return t(
        'Your open session has been cleared. This browser could not confirm removal of any saved copy. Close other MoMo Lens tabs and try deleting again.',
      );
    }
  });
}
