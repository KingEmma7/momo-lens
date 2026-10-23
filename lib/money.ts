import type { Pesewas } from './parsers/types';

export function pesewas(value: number): Pesewas {
  if (!Number.isSafeInteger(value))
    throw new Error('Money must be a safe integer number of pesewas.');
  return value as Pesewas;
}

// ASSUMPTION: statements express cedis with at most two decimals; brackets and minus mark debits.
/** Parse cedis without multiplying a binary floating-point decimal. */
export function parseMoney(value: string): Pesewas {
  let clean = value
    .trim()
    .replace(/(?:GHS|GHC|GH[₵¢]|₵|¢)/gi, '')
    .replace(/[,\s]/g, '');
  if (!clean || clean === '-') return pesewas(0);
  const negative = clean.startsWith('-') || /^\(.*\)$/.test(clean);
  clean = clean.replace(/^\((.*)\)$/, '$1').replace(/^[+-]/, '');
  if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(clean))
    throw new Error('Amount is not a valid cedi value.');
  const [whole = '0', fraction = ''] = clean.split('.');
  const result = Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'));
  return pesewas(negative ? -result : result);
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(value / 100);
}

export function sumMoney(values: readonly number[]): Pesewas {
  return pesewas(values.reduce((sum, value) => sum + value, 0));
}
