import type { Transaction } from './parsers/types';

export function stableHash(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < value.length; index += 1)
    hash = BigInt.asUintN(64, (hash ^ BigInt(value.charCodeAt(index))) * 0x100000001b3n);
  return hash.toString(16).padStart(16, '0');
}

// ASSUMPTION: provider references with provider/time/amount identify the same transaction across narrative formatting changes.
export function canonicalTransactionId(transaction: Transaction): string {
  if (!transaction.reference) return transaction.id;
  return stableHash(
    JSON.stringify([
      transaction.provider,
      transaction.date,
      transaction.direction === 'out' ? -transaction.amount : transaction.amount,
      transaction.reference,
    ]),
  );
}

/** Migrate saved referenced rows and preserve an explicit user category when duplicates merge. */
export function migrateTransactions(transactions: readonly Transaction[]): Transaction[] {
  const unique = new Map<string, Transaction>();
  for (const transaction of transactions) {
    const id = canonicalTransactionId(transaction);
    const previous = unique.get(id);
    if (previous?.categorySource === 'user' && transaction.categorySource !== 'user') continue;
    unique.set(id, { ...transaction, id });
  }
  return [...unique.values()];
}

export function mergeImportedTransactions(
  saved: readonly Transaction[],
  imported: readonly Transaction[],
): { transactions: Transaction[]; duplicates: number } {
  const rows = new Map(
    migrateTransactions(saved).map((transaction) => [transaction.id, transaction]),
  );
  let duplicates = 0;
  for (const transaction of migrateTransactions(imported)) {
    const previous = rows.get(transaction.id);
    if (previous) {
      duplicates += 1;
      if (!previous.counterpartyKey && transaction.counterpartyKey)
        rows.set(transaction.id, { ...previous, counterpartyKey: transaction.counterpartyKey });
    } else rows.set(transaction.id, transaction);
  }
  return { transactions: [...rows.values()], duplicates };
}
