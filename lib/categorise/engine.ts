import type { Rule, Transaction, TransactionType } from '../parsers/types';
import { CATEGORY_IDS } from './defaults';

export function inferType(description: string): TransactionType {
  const text = description.toLowerCase();
  // ASSUMPTION: reversal/refund narratives identify separate rows; their parsed sign is retained and no original transaction is guessed.
  if (/revers(?:al|ed)|refund/.test(text)) return 'reversal';
  // ASSUMPTION: only an explicit standalone charge label identifies a fee row.
  // Mentioning a fee inside a transfer narrative must not turn its principal into a fee.
  if (
    /^(?:(?:e[ -]?levy|levy|tax|fees?|charges?|commission)\b|(?:transfer|transaction|service|payment|cash[ -]?out|withdrawal|merchant(?: payment)?)\s+(?:fees?|charges?)\b)/.test(
      text.trim(),
    )
  )
    return 'fee';
  if (/data|bundle|internet/.test(text)) return 'data';
  if (/airtime|top[ -]?up/.test(text)) return 'airtime';
  if (/cash[ -]?out|withdraw/.test(text)) return 'cash-out';
  if (/electric|\becg\b|\bwater\b|utility|utilities|\bbill\b|dstv|gotv/.test(text)) return 'bill';
  if (/merchant|momo[ -]?pay|\bpayment\b|\bpaid\b|purchase/.test(text)) return 'merchant-payment';
  if (/interest/.test(text)) return 'interest';
  if (/transfer|p2p|momo user|cash[ -]?in|deposit|received|sent|ghipss/.test(text))
    return 'transfer';
  return 'other';
}

export function categoryFor(
  transaction: Pick<Transaction, 'type' | 'direction' | 'rawDescription'>,
): string {
  const type =
    transaction.type === 'other' ? inferType(transaction.rawDescription) : transaction.type;
  if (type === 'transfer')
    return transaction.direction === 'in' ? 'transfers-received' : 'transfers-sent';
  const categories: Record<TransactionType, string> = {
    transfer: 'transfers-sent',
    'cash-out': 'cash-out',
    airtime: 'airtime',
    data: 'data',
    'merchant-payment': 'merchant-payments',
    bill: 'bills',
    fee: 'fees',
    interest: 'other',
    reversal: 'reversals',
    other: 'other',
  };
  return categories[type];
}

export function categorise(transaction: Transaction, rules: readonly Rule[] = []): Transaction {
  if (transaction.categorySource === 'user' && CATEGORY_IDS.has(transaction.categoryId))
    return transaction;
  const ordered = [...rules].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const matched = ordered.find((rule) => {
    if (!CATEGORY_IDS.has(rule.categoryId)) return false;
    const { counterparty, counterpartyKey, descriptionContains, type } = rule.match;
    if (!counterparty && !counterpartyKey && !descriptionContains && !type) return false;
    return (
      (!counterpartyKey || counterpartyKey === transaction.counterpartyKey) &&
      (!counterparty ||
        counterparty.toLocaleLowerCase('en').trim() ===
          (transaction.counterpartyName ?? transaction.counterpartyMasked ?? '')
            .toLocaleLowerCase('en')
            .trim()) &&
      (!descriptionContains ||
        transaction.rawDescription
          .toLocaleLowerCase('en')
          .includes(descriptionContains.toLocaleLowerCase('en'))) &&
      (!type || transaction.type === type)
    );
  });
  return {
    ...transaction,
    categoryId: matched?.categoryId ?? categoryFor(transaction),
    categorySource: matched ? 'rule' : 'default',
  };
}
export function applyRules(
  transactions: readonly Transaction[],
  rules: readonly Rule[],
): Transaction[] {
  return transactions.map((transaction) => categorise(transaction, rules));
}
