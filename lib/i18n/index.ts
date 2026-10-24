import en, { type TranslationKey } from './en';
import tw from './tw';
import type { ColumnMapping, TransactionType } from '../parsers/types';

export type Locale = 'en' | 'tw';
export type MessageValues = Readonly<Record<string, string | number>>;
// Reuse only the supplied Twi draft. New English messages deliberately fall back to English.
const twByEnglish = new Map(
  Object.entries(tw).map(([key, value]) => [en[key as TranslationKey], value]),
);
export function t(key: TranslationKey, locale: Locale = 'en', values: MessageValues = {}): string {
  const message = locale === 'tw' ? (tw[key] ?? twByEnglish.get(en[key]) ?? en[key]) : en[key];
  return message.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (placeholder, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder,
  );
}
/** The draft keeps English as the document language and identifies only supplied Twi labels. */
export function textLanguage(text: string, locale: Locale): Locale {
  return locale === 'tw' &&
    Object.entries(tw).some(([key, value]) => value === text && value !== en[key as TranslationKey])
    ? 'tw'
    : 'en';
}
export type Translator = (key: TranslationKey, values?: MessageValues) => string;
const translators: Record<Locale, Translator> = {
  en: (key, values) => t(key, 'en', values),
  tw: (key, values) => t(key, 'tw', values),
};
export function translator(locale: Locale): Translator {
  return locale === 'tw' ? translators.tw : translators.en;
}
/** Only call for application-generated errors and warnings, never imported descriptions or names. */
export function translateSystemMessage(message: string, locale: Locale = 'en'): string {
  if (Object.hasOwn(en, message)) return t(message as TranslationKey, locale);
  const duplicates = /^(\d+) duplicate rows were removed\.$/.exec(message);
  if (duplicates?.[1])
    return t('{count} duplicate rows were removed.', locale, { count: duplicates[1] });
  return message;
}
export const mappingColumnKeys = {
  date: 'Date column',
  description: 'Description column',
  amount: 'Amount column',
  debit: 'Debit column',
  credit: 'Credit column',
  balance: 'Balance column',
  counterparty: 'Counterparty column',
} as const satisfies Record<keyof ColumnMapping, TranslationKey>;
export const transactionTypeKeys = {
  transfer: 'transfer',
  'cash-out': 'cash out',
  airtime: 'airtime',
  data: 'data',
  'merchant-payment': 'merchant payment',
  bill: 'bill',
  fee: 'fee',
  interest: 'interest',
  reversal: 'reversal',
  other: 'other',
} as const satisfies Record<TransactionType, TranslationKey>;
export { en, tw };
export type { TranslationKey };
