import { t } from '../i18n/index';
import type { Rule, Transaction } from '../parsers/types';
import { CATEGORY_IDS } from './defaults';

export function counterpartyRule(transaction: Transaction, categoryId: string): Rule {
  const counterparty = transaction.counterpartyName ?? transaction.counterpartyMasked;
  if (!counterparty) throw new Error(t('This transaction has no counterparty to match.'));
  if (!CATEGORY_IDS.has(categoryId)) throw new Error(t('Choose a valid category.'));
  return {
    id: crypto.randomUUID(),
    match: transaction.counterpartyKey
      ? { counterpartyKey: transaction.counterpartyKey }
      : { counterparty },
    categoryId,
    createdAt: new Date().toISOString(),
  };
}
