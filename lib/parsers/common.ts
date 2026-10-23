import Papa from 'papaparse';
import { z } from 'zod';
import { parseDate } from '../dates';
import { parseMoney, pesewas } from '../money';
import { categorise, inferType } from '../categorise/engine';
import type {
  ColumnMapping,
  ImportSession,
  ParseInput,
  ParseResult,
  Provider,
  Transaction,
} from './types';

// ASSUMPTION: a deterministic 64-bit row hash identifies duplicate imports; identical reference-free rows remain ambiguous.
export function stableHash(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < value.length; index += 1)
    hash = BigInt.asUintN(64, (hash ^ BigInt(value.charCodeAt(index))) * 0x100000001b3n);
  return hash.toString(16).padStart(16, '0');
}
export const normalHeader = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');
const ALIASES: Record<string, string[]> = {
  date: ['date', 'datetime', 'dateandtime', 'transactiondate', 'completiontime', 'completiondate'],
  description: [
    'description',
    'details',
    'transactiondetails',
    'paymenttype',
    'transactiontype',
    'narration',
  ],
  amount: ['amount', 'transactionamount'],
  debit: ['debit', 'withdrawn', 'debitamount', 'paidout', 'moneyout'],
  credit: ['credit', 'paidin', 'creditamount', 'moneyin'],
  balance: ['balance', 'availablebalance', 'balanceafter', 'closingbalance'],
  counterparty: ['counterparty', 'oppositeparty', 'accountname', 'tofrom', 'recipient', 'name'],
  fee: ['fee', 'fees', 'charge', 'charges'],
  levy: ['levy', 'elevy', 'tax'],
  reference: ['transactionid', 'receiptno', 'receiptnumber', 'receipt', 'reference', 'ref'],
  status: ['transactionstatus', 'status'],
  counterpartyNumber: ['tofrom', 'phone', 'msisdn', 'number'],
};
export interface ParsedTable {
  columns: string[];
  rows: string[][];
  rowOffset: number;
}
export interface InternalMapping extends ColumnMapping {
  fee?: string;
  levy?: string;
  reference?: string;
  status?: string;
  counterpartyNumber?: string;
}

// ASSUMPTION: PDF visual cells are separated by pipes, tabs or two spaces; wrapped descriptions follow their date row.
function splitLine(line: string): string[] {
  if (line.includes('|')) return line.split('|').map((cell) => cell.trim());
  if (line.includes('\t')) return line.split('\t').map((cell) => cell.trim());
  return line.split(/\s{2,}/).map((cell) => cell.trim());
}
export function readTable(input: ParseInput): ParsedTable {
  let rows: string[][];
  if (input.kind === 'csv') {
    const parsed = Papa.parse<string[]>(input.text.replace(/^\uFEFF/, ''), {
      skipEmptyLines: 'greedy',
    });
    rows = parsed.data;
  } else {
    rows = input.text
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map(splitLine);
  }
  const headerIndex = rows.findIndex((row) => {
    const normalized = row.map(normalHeader);
    return (
      normalized.some((cell) => (ALIASES.date ?? []).includes(cell)) &&
      normalized.some(
        (cell) =>
          (ALIASES.amount ?? []).includes(cell) ||
          (ALIASES.debit ?? []).includes(cell) ||
          (ALIASES.credit ?? []).includes(cell),
      )
    );
  });
  const offset = headerIndex >= 0 ? headerIndex : 0;
  const columns = (rows[offset] ?? []).map(
    (column, index) => column.trim() || `Column ${index + 1}`,
  );
  return { columns, rows: rows.slice(offset + 1), rowOffset: offset + 2 };
}
export function guessMapping(columns: readonly string[]): InternalMapping | undefined {
  const find = (key: string): string | undefined => {
    for (const alias of ALIASES[key] ?? []) {
      const column = columns.find((value) => normalHeader(value) === alias);
      if (column) return column;
    }
    return undefined;
  };
  const date = find('date');
  const description = find('description');
  if (!date || !description || (!find('amount') && !find('debit') && !find('credit')))
    return undefined;
  const mapping: InternalMapping = { date, description };
  for (const key of [
    'amount',
    'debit',
    'credit',
    'balance',
    'counterparty',
    'fee',
    'levy',
    'reference',
    'status',
    'counterpartyNumber',
  ] as const) {
    const column = find(key);
    if (column) mapping[key] = column;
  }
  return mapping;
}
const moneySchema = z.number().int().nonnegative().safe();
const rowSchema = z.object({
  date: z.string().datetime(),
  amount: moneySchema,
  fee: moneySchema,
  levy: moneySchema,
  direction: z.enum(['in', 'out']),
});
const PHONE =
  /(?:\+?233[\s().-]*(?:\(0\)[\s().-]*)?[235]\d(?:[\s().-]*\d){7}|0[235]\d(?:[\s().-]*\d){7})\b/g;
export function maskPhone(value: string): string {
  return value.replace(PHONE, (match) => {
    const digits = match.replace(/\D/g, '');
    return `${digits.slice(0, 3)}••••${digits.slice(-3)}`;
  });
}
export function makeSession(name: string, provider: Provider): ImportSession {
  return {
    id: stableHash(`${provider}|${name}`),
    fileName: name,
    provider,
    periodStart: '',
    periodEnd: '',
    parsedCount: 0,
    skippedRows: [],
    warnings: [],
  };
}

export function parseTable(input: ParseInput, provider: Provider): ParseResult {
  const table = readTable(input);
  const session = makeSession(input.name, provider);
  const mapping = input.mapping ?? guessMapping(table.columns);
  if (!mapping)
    return {
      transactions: [],
      session,
      columns: table.columns,
      preview: table.rows.slice(0, 5),
      needsMapping: true,
    };
  const internal = mapping as InternalMapping;
  if (new Set(table.columns).size !== table.columns.length) {
    session.warnings.push('Some column names repeat. Rename duplicate CSV headers before mapping.');
    return {
      transactions: [],
      session,
      columns: table.columns,
      preview: table.rows.slice(0, 5),
      needsMapping: true,
    };
  }
  const required = [
    mapping.date,
    mapping.description,
    mapping.amount,
    mapping.debit,
    mapping.credit,
  ].filter(Boolean);
  if (
    required.some((column) => !table.columns.includes(column ?? '')) ||
    (!mapping.amount && !mapping.debit && !mapping.credit)
  ) {
    session.warnings.push('Choose existing date, description and amount columns.');
    return {
      transactions: [],
      session,
      columns: table.columns,
      preview: table.rows.slice(0, 5),
      needsMapping: true,
    };
  }
  const transactions: Transaction[] = [];
  let pending: string[] | undefined;
  const pdfRows: string[][] = [];
  if (input.kind === 'pdf') {
    for (const row of table.rows) {
      if (
        row.every((cell) => !cell) ||
        row.some((cell) =>
          /^(?:page \d+(?: of \d+)?|mtn momo statement|telecel cash statement)$/i.test(cell),
        ) ||
        row.map(normalHeader).join('') === table.columns.map(normalHeader).join('')
      )
        continue;
      const dateCell = row[table.columns.indexOf(mapping.date)] ?? '';
      let startsRow = false;
      try {
        parseDate(dateCell);
        startsRow = true;
      } catch {
        /* Wrapped descriptions do not contain a date. */
      }
      if (startsRow) {
        if (pending) pdfRows.push(pending);
        pending = [...row];
      } else if (pending && row.length < table.columns.length) {
        const index = table.columns.indexOf(mapping.description);
        pending[index] = `${pending[index] ?? ''} ${row.join(' ')}`.trim();
      } else if (!pending) pdfRows.push(row);
    }
    if (pending) pdfRows.push(pending);
  }
  const rows = input.kind === 'pdf' ? pdfRows : table.rows;
  rows.forEach((row, index) => {
    const cell = (column: string | undefined): string =>
      column ? (row[table.columns.indexOf(column)]?.trim() ?? '') : '';
    if (row.map(normalHeader).join('') === table.columns.map(normalHeader).join('')) return;
    const status = cell(internal.status);
    if (status && !/^(completed|successful|success|complete)$/i.test(status)) {
      session.skippedRows.push({
        row: index + table.rowOffset,
        reason: 'Transaction was not completed.',
      });
      return;
    }
    try {
      const rawDescription = maskPhone(cell(mapping.description));
      if (!rawDescription) throw new Error('Description is missing.');
      const date = parseDate(cell(mapping.date));
      const debit = parseMoney(cell(mapping.debit));
      const credit = parseMoney(cell(mapping.credit));
      if (debit !== 0 && credit !== 0) throw new Error('Both debit and credit have values.');
      const signed = mapping.amount
        ? parseMoney(cell(mapping.amount))
        : credit !== 0
          ? Math.abs(credit)
          : -Math.abs(debit);
      const amount = pesewas(Math.abs(signed));
      const fee = pesewas(Math.abs(parseMoney(cell(internal.fee))));
      const levy = pesewas(Math.abs(parseMoney(cell(internal.levy))));
      const direction =
        signed < 0 || (signed === 0 && fee + levy > 0) ? ('out' as const) : ('in' as const);
      if (amount === 0 && fee === 0 && levy === 0)
        throw new Error('Row contains no money movement.');
      rowSchema.parse({ date, amount, fee, levy, direction });
      const counterpartyRaw = cell(mapping.counterparty);
      const phone =
        counterpartyRaw.match(PHONE)?.[0] ??
        cell(internal.counterpartyNumber).match(PHONE)?.[0] ??
        cell(mapping.description).match(PHONE)?.[0];
      const counterpartyName = counterpartyRaw
        .replace(PHONE, '')
        .replace(/^[\s,;|:-]+|[\s,;|:-]+$/g, '')
        .trim();
      const reference = cell(internal.reference);
      const type = inferType(rawDescription);
      const transaction: Transaction = {
        id: stableHash(
          JSON.stringify([
            provider,
            date,
            signed,
            fee,
            levy,
            reference,
            cell(mapping.description),
            counterpartyRaw,
          ]),
        ),
        provider,
        date,
        type,
        direction,
        amount,
        fee,
        levy,
        rawDescription,
        categoryId: 'other',
        categorySource: 'default',
      };
      const balance = cell(mapping.balance);
      if (balance) transaction.balanceAfter = parseMoney(balance);
      if (counterpartyName) transaction.counterpartyName = counterpartyName;
      if (phone) transaction.counterpartyMasked = maskPhone(phone);
      if (reference) transaction.reference = reference;
      transactions.push(categorise(transaction));
    } catch (error) {
      const safeMessages = [
        'Description is missing.',
        'Both debit and credit have values.',
        'Row contains no money movement.',
        'Date is not recognised. Use day/month/year or ISO dates.',
        'Date is outside the valid calendar.',
        'Amount is not a valid cedi value.',
        'Money must be a safe integer number of pesewas.',
      ];
      const reason =
        error instanceof Error && safeMessages.includes(error.message)
          ? error.message
          : 'Row has an invalid date or amount.';
      session.skippedRows.push({ row: index + table.rowOffset, reason });
    }
  });
  const unique = [
    ...new Map(transactions.map((transaction) => [transaction.id, transaction])).values(),
  ].sort((a, b) => b.date.localeCompare(a.date));
  if (unique.length !== transactions.length)
    session.warnings.push(`${transactions.length - unique.length} duplicate rows were removed.`);
  session.parsedCount = unique.length;
  session.periodStart = unique.at(-1)?.date ?? '';
  session.periodEnd = unique[0]?.date ?? '';
  session.id = stableHash(`${provider}|${input.text}`);
  if (provider !== 'generic')
    session.warnings.push(
      'Parser uses a documented synthetic layout. Check the results against your statement.',
    );
  if (unique.length === 0 && table.rows.length > 0)
    return {
      transactions: unique,
      session,
      columns: table.columns,
      preview: table.rows.slice(0, 5),
      needsMapping: true,
    };
  return { transactions: unique, session };
}
