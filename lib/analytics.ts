import { t, type TranslationKey } from './i18n/index';
import { CATEGORIES } from './categorise/defaults';
import type { Transaction } from './parsers/types';

export interface CategoryTotal {
  id: string;
  labelKey: TranslationKey;
  label: string;
  amount: number;
  count: number;
}
export interface MonthlyTotal {
  month: string;
  incoming: number;
  outgoing: number;
  net: number;
}
export interface CounterpartyTotal {
  key: string;
  name: string;
  amount: number;
  count: number;
}
export interface Summary {
  totalIn: number;
  totalOut: number;
  net: number;
  totalFees: number;
  totalLevy: number;
  dataSpend: number;
  airtimeSpend: number;
  transferCount: number;
  categoryTotals: CategoryTotal[];
  months: MonthlyTotal[];
  recipients: CounterpartyTotal[];
  senders: CounterpartyTotal[];
  biggestSpends: Transaction[];
  periodStart: string;
  periodEnd: string;
}
/** Cash-flow accounting: reversals remain visible as credits, never erased from the ledger. */
export function summarise(transactions: readonly Transaction[]): Summary {
  let totalIn = 0;
  let totalOut = 0;
  let totalFees = 0;
  let totalLevy = 0;
  let dataSpend = 0;
  let airtimeSpend = 0;
  let transferCount = 0;
  const categories = new Map<string, CategoryTotal>();
  const months = new Map<string, MonthlyTotal>();
  const recipients = new Map<string, CounterpartyTotal>();
  const senders = new Map<string, CounterpartyTotal>();
  const group = (map: Map<string, CounterpartyTotal>, tx: Transaction): void => {
    const name = tx.counterpartyName ?? tx.counterpartyMasked ?? t('Unknown counterparty');
    const key = tx.counterpartyKey ?? name;
    const current = map.get(key) ?? { key, name, amount: 0, count: 0 };
    current.amount += tx.amount;
    current.count += 1;
    map.set(key, current);
  };
  const addCategory = (id: string, amount: number): void => {
    if (amount === 0) return;
    const current = categories.get(id) ?? {
      id,
      labelKey: CATEGORIES.find((category) => category.id === id)?.labelKey ?? 'Other',
      label: CATEGORIES.find((category) => category.id === id)?.label ?? t('Other'),
      amount: 0,
      count: 0,
    };
    current.amount += amount;
    current.count += 1;
    categories.set(id, current);
  };
  for (const transaction of transactions) {
    const charges = transaction.fee + transaction.levy;
    const outgoing = transaction.direction === 'out' ? transaction.amount + charges : charges;
    const incoming = transaction.direction === 'in' ? transaction.amount : 0;
    totalIn += incoming;
    totalOut += outgoing;
    totalFees +=
      transaction.fee +
      (transaction.type === 'fee' &&
      transaction.direction === 'out' &&
      !/e[ -]?levy|\blevy\b|\btax\b/i.test(transaction.rawDescription)
        ? transaction.amount
        : 0);
    totalLevy +=
      transaction.levy +
      (transaction.type === 'fee' &&
      transaction.direction === 'out' &&
      /e[ -]?levy|\blevy\b|\btax\b/i.test(transaction.rawDescription)
        ? transaction.amount
        : 0);
    if (transaction.direction === 'out') {
      addCategory(transaction.categoryId, transaction.amount);
      if (transaction.categoryId === 'data') dataSpend += transaction.amount;
      if (transaction.categoryId === 'airtime') airtimeSpend += transaction.amount;
    }
    addCategory('fees', charges);
    if (transaction.type === 'transfer') {
      transferCount += 1;
      group(transaction.direction === 'out' ? recipients : senders, transaction);
    }
    const month = transaction.date.slice(0, 7);
    const current = months.get(month) ?? { month, incoming: 0, outgoing: 0, net: 0 };
    current.incoming += incoming;
    current.outgoing += outgoing;
    current.net = current.incoming - current.outgoing;
    months.set(month, current);
  }
  // Reject an extreme import instead of silently dropping pesewas through floating-point overflow.
  const monetaryTotals = [
    totalIn,
    totalOut,
    totalFees,
    totalLevy,
    dataSpend,
    airtimeSpend,
    ...[...categories.values()].map((item) => item.amount),
    ...[...months.values()].flatMap((item) => [item.incoming, item.outgoing, item.net]),
    ...[...recipients.values(), ...senders.values()].map((item) => item.amount),
  ];
  if (monetaryTotals.some((value) => !Number.isSafeInteger(value))) {
    throw new RangeError(t('The statement total exceeds safe integer money arithmetic.'));
  }
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const rank = (map: Map<string, CounterpartyTotal>): CounterpartyTotal[] =>
    [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, 10);
  return {
    totalIn,
    totalOut,
    net: totalIn - totalOut,
    totalFees,
    totalLevy,
    dataSpend,
    airtimeSpend,
    transferCount,
    categoryTotals: [...categories.values()].sort((a, b) => b.amount - a.amount),
    months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
    recipients: rank(recipients),
    senders: rank(senders),
    biggestSpends: transactions
      .filter((transaction) => transaction.direction === 'out' && transaction.type !== 'fee')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
    periodStart: sorted[0]?.date ?? '',
    periodEnd: sorted.at(-1)?.date ?? '',
  };
}
