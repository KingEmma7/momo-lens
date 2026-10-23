import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { detectAndParse, PARSERS } from '../lib/parsers/registry';
import { parseGenericCsv, genericCsvParser } from '../lib/parsers/generic-csv';
import {
  guessMapping,
  maskPhone,
  normalHeader,
  parseTable,
  readTable,
  stableHash,
} from '../lib/parsers/common';
import { mtnParser } from '../lib/parsers/mtn-gh';
import { telecelParser } from '../lib/parsers/telecel-gh';
import { pesewas, parseMoney, formatMoney, sumMoney } from '../lib/money';
import { formatDate, parseDate } from '../lib/dates';
import { applyRules, categorise, categoryFor, inferType } from '../lib/categorise/engine';
import { counterpartyRule } from '../lib/categorise/rules';
import { CATEGORIES } from '../lib/categorise/defaults';
import { summarise } from '../lib/analytics';
import type { ColumnMapping, ParseInput, Rule, Transaction } from '../lib/parsers/types';

const fixture = (name: string): string => readFileSync(`fixtures/${name}`, 'utf8');
const input = (text: string, extra: Partial<ParseInput> = {}): ParseInput => ({
  name: 'mtn.csv',
  text,
  kind: 'csv',
  ...extra,
});
const csv = (
  rows: string,
  columns = 'Date,Description,Amount,Fees,Tax,Balance,Account Name,Transaction ID,To/From',
): string => `${columns}\n${rows}`;
const transaction = (extra: Partial<Transaction> = {}): Transaction => ({
  id: 'test-id',
  provider: 'mtn-gh',
  date: '2026-09-01T00:00:00.000Z',
  type: 'transfer',
  direction: 'out',
  amount: pesewas(10000),
  fee: pesewas(100),
  levy: pesewas(0),
  counterpartyName: 'Ama',
  rawDescription: 'Transfer sent',
  categoryId: 'transfers-sent',
  categorySource: 'default',
  ...extra,
});

describe('money and dates', () => {
  it.each([
    ['1,234.56', 123456],
    ['GHS 10.10', 1010],
    ['GH₵ 1', 100],
    ['GH¢ 1', 100],
    ['GHC 2', 200],
    ['₵ 0.99', 99],
    ['(25.50)', -2550],
    ['-2', -200],
    ['+3.1', 310],
    ['.58', 58],
    ['', 0],
    ['-', 0],
  ])('parses %s as integer pesewas', (value, expected) => expect(parseMoney(value)).toBe(expected));
  it('rejects malformed and unsafe amounts', () => {
    for (const value of ['1.234', 'abc', '1.2.3', '--1', '(abc)', '90071992547409999'])
      expect(() => parseMoney(value)).toThrow();
    expect(() => pesewas(0.1)).toThrow();
    expect(() => pesewas(Infinity)).toThrow();
    expect(sumMoney([10, 20])).toBe(30);
    expect(formatMoney(125)).toMatch(/1\.25/);
  });
  it.each(['01/09/2026', '01-09-2026', '01-Sep-2026', '1 Sep 2026', '2026-09-01'])(
    'parses date %s in Accra',
    (value) => expect(parseDate(value)).toBe('2026-09-01T00:00:00.000Z'),
  );
  it('preserves time and validates the calendar', () => {
    expect(parseDate('01/09/2026 9:12')).toBe('2026-09-01T09:12:00.000Z');
    expect(parseDate('2026-09-01 09:12:13')).toBe('2026-09-01T09:12:13.000Z');
    expect(parseDate('2026-09-01T09:12:13.000Z')).toBe('2026-09-01T09:12:13.000Z');
    expect(parseDate('01-Sep-2026 09:12:13')).toBe('2026-09-01T09:12:13.000Z');
    for (const value of [
      '31/02/2026',
      '01/13/2026',
      '00/01/2026',
      '01/01/1899',
      '01/01/2201',
      '01/01/2026 24:00',
      '01/01/2026 12:60',
      '01/01/2026 12:00:60',
      '01-Xxx-2026',
      'yesterday',
    ])
      expect(() => parseDate(value)).toThrow();
    expect(formatDate('2026-09-01T00:00:00Z')).toContain('2026');
  });
});

describe('provider fixtures and detection', () => {
  it.each(['mtn', 'telecel'])('matches the exact synthetic %s JSON fixture', async (provider) => {
    const result = await detectAndParse(
      input(fixture(`${provider}-synthetic.csv`), { name: `${provider}-synthetic.csv` }),
    );
    expect(result.transactions).toEqual(JSON.parse(fixture(`${provider}-expected.json`)));
    expect(result.session.skippedRows).toEqual([]);
    expect(result.session.parsedCount).toBe(provider === 'mtn' ? 24 : 8);
    expect(result.session.periodStart).not.toBe('');
    expect(result.session.periodEnd).not.toBe('');
    expect(result.session.warnings).toHaveLength(1);
  });
  it('requires both a provider hint and structural columns', () => {
    expect(PARSERS).toHaveLength(2);
    for (const parser of [mtnParser, telecelParser]) {
      expect(parser.detect({ name: 'unknown.csv' }, 'Hello')).toBe(0);
      expect(parser.detect({ name: `${parser.id}.csv` }, 'Brand but no columns')).toBe(0);
      expect(
        parser.detect({ name: 'unknown.csv' }, 'Date,Description,Amount\n01/09/2026,Airtime,-1'),
      ).toBe(0);
    }
    expect(mtnParser.detect({ name: 'mtn.csv' }, 'Date,Description,Amount')).toBeGreaterThan(0.8);
    expect(
      telecelParser.detect({ name: 'vodafone.csv' }, 'Date,Description,Amount'),
    ).toBeGreaterThan(0.8);
    expect(mtnParser.detect({ name: 'mtn.pdf' }, 'Date  Description  Amount')).toBeGreaterThan(0.8);
    expect(
      telecelParser.detect({ name: 'telecel.pdf' }, 'Completion time  Details  Withdrawn'),
    ).toBeGreaterThan(0.8);
  });
  it('returns a mapping preview for an unknown CSV', async () => {
    const result = await detectAndParse(
      input(fixture('unknown-layout.csv'), { name: 'unknown.csv' }),
    );
    expect(result.needsMapping).toBe(true);
    expect(result.columns).toEqual(['When', 'What happened', 'Money', 'Who', 'Remaining']);
    expect(result.preview).toHaveLength(3);
    const mapping: ColumnMapping = {
      date: 'When',
      description: 'What happened',
      amount: 'Money',
      counterparty: 'Who',
      balance: 'Remaining',
    };
    const progress = vi.fn();
    const parsed = await detectAndParse(
      input(fixture('unknown-layout.csv'), { name: 'unknown.csv', mapping }),
      progress,
    );
    expect(parsed.transactions).toHaveLength(3);
    expect(parsed.transactions.find((tx) => tx.amount === 2500)?.direction).toBe('out');
    expect(parsed.session.provider).toBe('generic');
    expect(progress).toHaveBeenLastCalledWith(100, 'Statement ready');
    expect(genericCsvParser.detect({ name: 'x' }, '')).toBe(0);
  });
  it('reports progress without exposing statement content', async () => {
    const progress = vi.fn();
    await detectAndParse(input(fixture('mtn-synthetic.csv')), progress);
    expect(progress.mock.calls.map((call) => call[0])).toEqual([10, 35, 100]);
    const mapping = await detectAndParse(
      input('Date,Description,Amount\n01/09/2026,Airtime,-5', { name: 'generic.csv' }),
      progress,
    );
    expect(mapping.needsMapping).toBe(true);
    expect(progress).toHaveBeenLastCalledWith(100, 'Choose the statement columns');
  });
});

describe('table normalization and edge cases', () => {
  it('uses integer fees, masks numbers, and respects signed values', () => {
    const result = parseTable(
      input(
        csv(
          '01/09/2026,Transfer to 0240000001,"(1,200.50)",GHS 3.00,GH₵ 1.50,500.00,Ama 0240000001,REF1,0240000001',
        ),
      ),
      'mtn-gh',
    );
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({
      amount: 120050,
      fee: 300,
      levy: 150,
      direction: 'out',
      balanceAfter: 50000,
      counterpartyName: 'Ama',
      counterpartyMasked: '024••••001',
      rawDescription: 'Transfer to 024••••001',
      reference: 'REF1',
    });
    expect(maskPhone('+233 24 000 0001')).toBe('233••••001');
    expect(maskPhone('No phone')).toBe('No phone');
  });
  it('finds an explicit name before a number column', () => {
    const tx = parseTable(input(csv('01/09/2026,Airtime,-1,0,0,50,Ama,ID,0240000001')), 'mtn-gh')
      .transactions[0];
    expect(tx?.counterpartyName).toBe('Ama');
    expect(tx?.counterpartyMasked).toBe('024••••001');
  });
  it('uses debit and credit labels regardless of their sign', () => {
    const result = parseTable(
      input(
        'Completion time,Details,Paid In,Withdrawn,Transaction Status,Opposite Party\n2026-09-01,Transfer received,-100,0,Completed,Akua\n2026-09-02,Transfer out,0,-50,Success,Kofi\n2026-09-03,Failed transfer,0,50,Failed,Kofi\n2026-09-04,Ambiguous transfer,20,30,Completed,Ama',
      ),
      'telecel-gh',
    );
    expect(result.transactions.map((tx) => [tx.amount, tx.direction])).toEqual([
      [5000, 'out'],
      [10000, 'in'],
    ]);
    expect(result.session.skippedRows).toEqual([
      { row: 4, reason: 'Transaction was not completed.' },
      { row: 5, reason: 'Both debit and credit have values.' },
    ]);
  });
  it('accepts credit-only and debit-only mappings', () => {
    expect(
      parseTable(input('Date,Description,Credit\n01/09/2026,Received,10'), 'generic')
        .transactions[0]?.direction,
    ).toBe('in');
    expect(
      parseTable(input('Date,Description,Debit\n01/09/2026,Sent,10'), 'generic').transactions[0]
        ?.direction,
    ).toBe('out');
  });
  it('handles missing data without logging raw values', () => {
    const result = parseTable(
      input(
        csv(
          '01/09/2026,No movement,0,0,0,,,,\nwrong date,Private description,-10,0,0,,,,\n01/09/2026,,-10,0,0,,,,\n01/09/2026,Invalid amount,wat,0,0,,,,\n01/09/2026,Big amount,90071992547409999,0,0,,,,',
        ),
      ),
      'mtn-gh',
    );
    expect(result.transactions).toHaveLength(0);
    expect(result.needsMapping).toBe(true);
    expect(result.session.skippedRows).toHaveLength(5);
    expect(JSON.stringify(result.session.skippedRows)).not.toContain('Private');
  });
  it('catches unexpected schema validation failures', () => {
    const result = parseTable(
      input(csv('01/09/2026,Transfer,-1,0,0,not-money,Ama,ID,0240000001')),
      'mtn-gh',
    );
    expect(result.transactions).toHaveLength(0);
    expect(result.session.skippedRows[0]?.reason).toContain('Amount');
  });
  it('preserves empty and single transaction statements', async () => {
    expect((await detectAndParse(input('Date,Description,Amount'))).transactions).toEqual([]);
    expect(
      parseTable(input('Date,Description,Amount\n01/09/2026,Transfer,-1'), 'mtn-gh').transactions,
    ).toHaveLength(1);
    const empty = parseTable(input(''), 'mtn-gh');
    expect(empty.needsMapping).toBe(true);
    expect(empty.columns).toEqual([]);
    expect(readTable(input(',Description,Amount\n01/09/2026,Transfer,-1')).columns[0]).toBe(
      'Column 1',
    );
  });
  it('validates mappings and duplicate column names', () => {
    expect(guessMapping(['Date', 'Amount'])).toBeUndefined();
    expect(
      parseTable(
        input('Date,Date,Description,Amount\n01/09/2026,01/09/2026,Transfer,-1'),
        'generic',
      ).needsMapping,
    ).toBe(true);
    expect(
      parseTable(
        input('Date,Description,Amount', {
          mapping: { date: 'Missing', description: 'Description', amount: 'Amount' },
        }),
        'generic',
      ).session.warnings[0],
    ).toContain('existing');
    expect(
      parseTable(
        input('Date,Description,Amount', { mapping: { date: 'Date', description: 'Description' } }),
        'generic',
      ).needsMapping,
    ).toBe(true);
    expect(parseGenericCsv(input('A,B\nx,y')).needsMapping).toBe(true);
  });
  it('deduplicates repeated and overlapping files while preserving providers', async () => {
    const text =
      'Date,Description,Amount,Transaction ID\n01/09/2026,Transfer,-1,ID1\n01/09/2026,Transfer,-1,ID1\n02/09/2026,Transfer,-2,ID2';
    const a = await detectAndParse(input(text));
    const b = await detectAndParse(input(text, { name: 'mtn-overlap.csv' }));
    const c = await detectAndParse(input(text, { name: 'telecel.csv' }));
    expect(a.transactions).toEqual(b.transactions);
    expect(a.session.warnings.some((warning) => warning.includes('1 duplicate'))).toBe(true);
    expect(
      new Map([...a.transactions, ...b.transactions, ...c.transactions].map((tx) => [tx.id, tx]))
        .size,
    ).toBe(4);
    expect(stableHash('x')).toBe(stableHash('x'));
    expect(stableHash('x')).not.toBe(stableHash('y'));
  });
  it('handles a BOM, quoted commas, semicolons, and repeated CSV headers', () => {
    const parsed = parseTable(
      input(
        '\uFEFFDate;Description;Amount\n01/09/2026;"Merchant, shop";-1\nDate;Description;Amount',
      ),
      'mtn-gh',
    );
    expect(parsed.transactions[0]?.rawDescription).toBe('Merchant, shop');
    expect(parsed.session.skippedRows).toEqual([]);
    expect(normalHeader('Date & Time')).toBe('datetime');
  });
  it('retains same-row and standalone fees without duplication', () => {
    const result = parseTable(
      input(
        csv(
          '01/09/2026,Transfer,-100,1.00,0.50,200,Ama,1,\n01/09/2026,Transfer fee,-2,0,0,198,Provider,2,\n01/09/2026,E-Levy,-1,0,0,197,Provider,3,\n01/09/2026,Fee only,0,3,0,194,Provider,4,',
        ),
      ),
      'mtn-gh',
    );
    const summary = summarise(result.transactions);
    expect(summary.totalOut).toBe(10750);
    expect(summary.totalFees).toBe(600);
    expect(summary.totalLevy).toBe(150);
    expect(summary.categoryTotals.reduce((sum, category) => sum + category.amount, 0)).toBe(
      summary.totalOut,
    );
  });
  it('handles repeated PDF headers, footers and wrapped rows across pages', () => {
    const text =
      'MTN MoMo Statement\nDate  Description  Amount  Fees  Tax  Balance  Account Name  Transaction ID\n01/09/2026  Merchant payment  -50.00  1.00  0.00  500.00  Ama Shop  ID1\ncontinued narrative\nPage 1 of 2\nDate  Description  Amount  Fees  Tax  Balance  Account Name  Transaction ID\n02/09/2026  Data bundle  -10.00  0.00  0.00  490.00  MTN Data  ID2\nPage 2 of 2';
    const result = parseTable(input(text, { name: 'mtn.pdf', kind: 'pdf' }), 'mtn-gh');
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions.find((tx) => tx.reference === 'ID1')?.rawDescription).toBe(
      'Merchant payment continued narrative',
    );
    expect(result.session.skippedRows).toEqual([]);
  });
  it('supports pipe and tab PDF cells and rejects malformed pre-rows', () => {
    for (const separator of [' | ', '\t']) {
      const result = parseTable(
        input(
          [
            'Date' + separator + 'Description' + separator + 'Amount',
            'invalid' + separator + 'bad' + separator + '-5',
            '01/09/2026' + separator + 'Airtime' + separator + '-1',
          ].join('\n'),
          { name: 'mtn.pdf', kind: 'pdf' },
        ),
        'mtn-gh',
      );
      expect(result.transactions).toHaveLength(1);
      expect(result.session.skippedRows).toHaveLength(1);
    }
  });
  it('parses and deduplicates 10,001 rows without losing precision', () => {
    const rows = Array.from({ length: 10001 }, (_, index) => `01/09/2026,Transfer,-0.01,${index}`);
    const result = parseTable(
      input(`Date,Description,Amount,Transaction ID\n${rows.join('\n')}`),
      'mtn-gh',
    );
    expect(result.transactions).toHaveLength(10001);
    expect(summarise(result.transactions).totalOut).toBe(10001);
  });
});

describe('adversarial row identity and privacy', () => {
  it('prefers a unique transaction ID over repeated narrative references', () => {
    const result = parseTable(
      input(
        'Date,Description,Amount,Transaction ID,Reference,Account Name\n01/09/2026,Transfer,-10,TX-001,Family,Ama\n01/09/2026,Transfer,-10,TX-002,Family,Ama',
      ),
      'mtn-gh',
    );
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions.map((tx) => tx.reference)).toEqual(['TX-001', 'TX-002']);
  });
  it('keeps distinct recipients with identical masked phone labels', () => {
    const result = parseTable(
      input(
        'Date,Description,Amount\n01/09/2026,Transfer to 0241111001,-10\n01/09/2026,Transfer to 0242222001,-10',
      ),
      'mtn-gh',
    );
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]?.rawDescription).toBe(result.transactions[1]?.rawDescription);
    expect(result.transactions[0]?.id).not.toBe(result.transactions[1]?.id);
    expect(JSON.stringify(result.transactions)).not.toContain('0241111001');
    expect(JSON.stringify(result.transactions)).not.toContain('0242222001');
  });
  it('masks common Ghana phone punctuation before it enters descriptions or names', () => {
    const result = parseTable(
      input(
        'Date,Description,Amount,Account Name\n01/09/2026,Transfer to +233 (0) 24 000 0001,-10,Ama 024.000.0001',
      ),
      'mtn-gh',
    );
    expect(result.transactions[0]?.counterpartyName).toBe('Ama');
    expect(result.transactions[0]?.counterpartyMasked).toBe('024••••001');
    expect(result.transactions[0]?.rawDescription).toBe('Transfer to 233••••001');
  });
  it('treats explicit charge-only movements as outgoing and preserves distinct charges', () => {
    const result = parseTable(
      input(
        'Date,Description,Amount,Fees\n01/09/2026,Transfer fee,0,1.25\n01/09/2026,Transfer fee,0,2.00',
      ),
      'mtn-gh',
    );
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions.every((tx) => tx.direction === 'out')).toBe(true);
    const totals = summarise(result.transactions);
    expect(totals.totalOut).toBe(325);
    expect(totals.totalFees).toBe(325);
    expect(totals.totalIn).toBe(0);
  });
  it('does not count transfer principal as a fee when its narrative mentions charges', () => {
    const result = parseTable(
      input(
        'Date,Description,Amount,Fees\n01/09/2026,Transfer to Ama fee included,-100,1\n02/09/2026,Merchant payment no fee,-50,0',
      ),
      'mtn-gh',
    );
    expect(result.transactions.map((tx) => tx.type)).toEqual(['merchant-payment', 'transfer']);
    expect(summarise(result.transactions).totalFees).toBe(100);
    expect(inferType('Service charge')).toBe('fee');
    expect(inferType('Tax charge')).toBe('fee');
  });
  it('preserves untrusted text as strings without interpreting HTML or formulas', () => {
    const result = parseTable(
      input(
        'Date,Description,Amount,Account Name\n01/09/2026,<img src=x onerror=alert(1)>,-1,=HYPERLINK(1)',
      ),
      'mtn-gh',
    );
    expect(result.transactions[0]?.rawDescription).toBe('<img src=x onerror=alert(1)>');
    expect(result.transactions[0]?.counterpartyName).toBe('=HYPERLINK(1)');
  });
});

describe('categorisation and user rules', () => {
  it.each([
    ['Refund completed', 'reversal'],
    ['E-Levy paid', 'fee'],
    ['Transfer fee', 'fee'],
    ['Tax charge', 'fee'],
    ['Internet bundle', 'data'],
    ['Airtime top-up', 'airtime'],
    ['Cash withdrawal', 'cash-out'],
    ['Cash out', 'cash-out'],
    ['ECG electricity bill', 'bill'],
    ['Water utility', 'bill'],
    ['Merchant payment', 'merchant-payment'],
    ['Interest received', 'interest'],
    ['GhIPSS P2P transfer', 'transfer'],
    ['MOMO USER', 'transfer'],
    ['Cash in deposit', 'transfer'],
    ['Unclear narrative', 'other'],
  ])('classifies %s', (description, expected) => expect(inferType(description)).toBe(expected));
  it('covers every default category and derives types when needed', () => {
    const samples: Partial<Transaction>[] = [
      { type: 'airtime' },
      { type: 'data' },
      { type: 'transfer', direction: 'out' },
      { type: 'transfer', direction: 'in' },
      { type: 'cash-out' },
      { type: 'merchant-payment' },
      { type: 'bill' },
      { type: 'fee' },
      { type: 'reversal' },
      { type: 'interest' },
    ];
    expect(new Set(samples.map((extra) => categoryFor(transaction(extra))))).toEqual(
      new Set(CATEGORIES.map((category) => category.id)),
    );
    expect(categoryFor(transaction({ type: 'other', rawDescription: 'Data bundle' }))).toBe('data');
    expect(categoryFor(transaction({ type: 'other', rawDescription: 'Unknown' }))).toBe('other');
  });
  const rule = (extra: Partial<Rule> = {}): Rule => ({
    id: 'rule-1',
    match: { counterparty: 'Ama' },
    categoryId: 'bills',
    createdAt: '2026-01-01T00:00:00Z',
    ...extra,
  });
  it('applies persisted rules retroactively, case-insensitively, newest first', () => {
    const tx = transaction();
    const rules = [
      rule(),
      rule({
        id: 'new',
        categoryId: 'merchant-payments',
        createdAt: '2026-02-01T00:00:00Z',
        match: { counterparty: '  AMA ' },
      }),
    ];
    expect(applyRules([tx], rules)[0]).toMatchObject({
      categoryId: 'merchant-payments',
      categorySource: 'rule',
    });
    expect(categorise(tx, JSON.parse(JSON.stringify(rules)) as Rule[])).toEqual(
      applyRules([tx], rules)[0],
    );
    expect(categorise(tx)).toMatchObject({
      categorySource: 'default',
      categoryId: 'transfers-sent',
    });
  });
  it('combines all match conditions and ignores empty or invalid rules', () => {
    expect(
      categorise(transaction(), [
        rule({ match: { descriptionContains: 'SENT', type: 'transfer' } }),
      ]).categorySource,
    ).toBe('rule');
    for (const match of [
      { counterparty: 'Kofi' },
      { descriptionContains: 'Airtime' },
      { type: 'data' as const },
      {},
    ])
      expect(categorise(transaction(), [rule({ match })]).categorySource).toBe('default');
    expect(categorise(transaction(), [rule({ categoryId: 'invalid' })]).categorySource).toBe(
      'default',
    );
    expect(
      categorise(transaction({ counterpartyName: undefined, counterpartyMasked: '024••••001' }), [
        rule({ match: { counterparty: '024••••001' } }),
      ]).categorySource,
    ).toBe('rule');
    expect(categorise(transaction({ counterpartyName: undefined }), [rule()]).categorySource).toBe(
      'default',
    );
  });
  it('preserves manual recategorisation and repairs invalid categories', () => {
    const manual = transaction({ categorySource: 'user', categoryId: 'bills' });
    expect(categorise(manual, [rule({ categoryId: 'data' })])).toBe(manual);
    expect(
      categorise(transaction({ categorySource: 'user', categoryId: 'invalid' })).categoryId,
    ).toBe('transfers-sent');
  });
  it('creates counterparty rules and rejects unusable rules', () => {
    expect(counterpartyRule(transaction(), 'bills')).toMatchObject({
      match: { counterparty: 'Ama' },
      categoryId: 'bills',
    });
    expect(
      counterpartyRule(
        transaction({ counterpartyName: undefined, counterpartyMasked: '024••••001' }),
        'data',
      ).match.counterparty,
    ).toBe('024••••001');
    expect(() => counterpartyRule(transaction({ counterpartyName: undefined }), 'data')).toThrow(
      'no counterparty',
    );
    expect(() => counterpartyRule(transaction(), 'invalid')).toThrow('valid category');
  });
});

describe('dashboard reconciliation', () => {
  it('keeps reversals as cash-flow credits and splits explicit fees', () => {
    const txs = [
      transaction(),
      transaction({
        id: 'reversal',
        type: 'reversal',
        categoryId: 'reversals',
        direction: 'in',
        fee: pesewas(0),
      }),
      transaction({
        id: 'data',
        type: 'data',
        categoryId: 'data',
        amount: pesewas(1500),
        fee: pesewas(0),
      }),
      transaction({
        id: 'airtime',
        type: 'airtime',
        categoryId: 'airtime',
        amount: pesewas(500),
        fee: pesewas(0),
      }),
    ];
    const summary = summarise(txs);
    expect(summary.totalIn).toBe(10000);
    expect(summary.totalOut).toBe(12100);
    expect(summary.net).toBe(-2100);
    expect(summary.dataSpend).toBe(1500);
    expect(summary.airtimeSpend).toBe(500);
    expect(summary.transferCount).toBe(1);
    expect(summary.categoryTotals.reduce((sum, category) => sum + category.amount, 0)).toBe(12100);
    expect(summary.months[0]).toMatchObject({ incoming: 10000, outgoing: 12100, net: -2100 });
  });
  it('ranks both counterparties and limits recipient lists', () => {
    const txs = Array.from({ length: 12 }, (_, index) =>
      transaction({
        id: String(index),
        counterpartyName: `Person ${index}`,
        amount: pesewas(index * 100),
      }),
    );
    txs.push(
      transaction({
        id: 'incoming',
        direction: 'in',
        counterpartyName: undefined,
        counterpartyMasked: '024••••001',
      }),
      transaction({
        id: 'unknown',
        direction: 'in',
        counterpartyName: undefined,
        counterpartyMasked: undefined,
      }),
      transaction({ id: 'repeat', counterpartyName: 'Person 11' }),
    );
    const summary = summarise(txs);
    expect(summary.recipients).toHaveLength(10);
    expect(summary.recipients[0]?.count).toBe(2);
    expect(summary.senders).toHaveLength(2);
    expect(summary.biggestSpends).toHaveLength(5);
    expect(summary.periodStart).not.toBe('');
  });
  it('handles mixed providers and an empty statement', async () => {
    const a = await detectAndParse(input(fixture('mtn-synthetic.csv')));
    const b = await detectAndParse(
      input(fixture('telecel-synthetic.csv'), { name: 'telecel.csv' }),
    );
    const summary = summarise([...a.transactions, ...b.transactions]);
    expect(summary.categoryTotals.reduce((sum, category) => sum + category.amount, 0)).toBe(
      summary.totalOut,
    );
    expect(summary.totalIn - summary.totalOut).toBe(summary.net);
    expect(summary.months).toHaveLength(3);
    expect(summarise([])).toMatchObject({
      totalIn: 0,
      totalOut: 0,
      net: 0,
      months: [],
      periodStart: '',
      periodEnd: '',
    });
  });
});

describe('safe aggregate limits', () => {
  it('rejects valid individual rows whose total would lose integer precision', () => {
    const large = transaction({ amount: pesewas(Number.MAX_SAFE_INTEGER), fee: pesewas(0) });
    expect(() => summarise([large, { ...large, id: 'different' }])).toThrow(/safe integer/);
  });
});

describe('provider recovery', () => {
  it('offers column mapping if a detected CSV layout produces no valid rows', async () => {
    const result = await detectAndParse(
      input('Date,Description,Amount\ninvalid,Airtime,not-money'),
    );
    expect(result.needsMapping).toBe(true);
    expect(result.columns).toEqual(['Date', 'Description', 'Amount']);
    expect(result.session.warnings.join(' ')).toContain('column mapping');
  });
});
