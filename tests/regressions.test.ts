import { describe, expect, it } from 'vitest';
import { parseTable } from '../lib/parsers/common';
import { summarise } from '../lib/analytics';
import { parseMoney, pesewas } from '../lib/money';
import { applyRules } from '../lib/categorise/engine';
import { counterpartyRule } from '../lib/categorise/rules';
import type { Transaction } from '../lib/parsers/types';

describe('financial and parser regressions', () => {
  it('records a malformed PDF row after a valid transaction instead of silently dropping it', () => {
    const result = parseTable(
      {
        name: 'synthetic-mtn.pdf',
        kind: 'pdf',
        text: 'Date  Description  Amount\n01/09/2026  Transfer  -10\nnot-a-date  Transfer  -20\n02/09/2026  Transfer  -30',
      },
      'mtn-gh',
    );
    expect(result.transactions).toHaveLength(2);
    expect(result.session.skippedRows).toHaveLength(1);
  });
  it('uses provider reference identity across overlapping statement narrative variations', () => {
    const a = parseTable(
      {
        name: 'mtn-a.csv',
        kind: 'csv',
        text: 'Date,Description,Amount,Transaction ID\n01/09/2026,Transfer to Ama,-10,UNIQUE-1',
      },
      'mtn-gh',
    ).transactions;
    const b = parseTable(
      {
        name: 'mtn-b.csv',
        kind: 'csv',
        text: 'Date,Description,Amount,Transaction ID\n01/09/2026,Transfer  to Ama,-10,UNIQUE-1',
      },
      'mtn-gh',
    ).transactions;
    const combined = [...new Map([...a, ...b].map((tx) => [tx.id, tx])).values()];
    expect(combined).toHaveLength(1);
    expect(summarise(combined).totalOut).toBe(1000);
  });
  it('keeps rule matches separate when two synthetic phone numbers share a masked label', () => {
    const rows = parseTable(
      {
        name: 'mtn.csv',
        kind: 'csv',
        text: 'Date,Description,Amount,Transaction ID\n01/09/2026,Transfer to 0241111001,-10,UNIQUE-1\n01/09/2026,Transfer to 0242222001,-20,UNIQUE-2',
      },
      'mtn-gh',
    ).transactions;
    const first = rows[0];
    if (!first) throw new Error('Synthetic transaction missing.');
    const rule = counterpartyRule(first, 'bills');
    const changed = applyRules(rows, [rule]);
    expect(changed[0]?.categoryId).toBe('bills');
    expect(changed[1]?.categoryId).toBe('transfers-sent');
    const ranking = summarise(rows).recipients;
    expect(ranking).toHaveLength(2);
    expect(new Set(ranking.map((person) => person.key)).size).toBe(2);
    expect(ranking.every((person) => typeof person.key === 'string')).toBe(true);
  });
  it('matches a BigInt decimal oracle on two-decimal boundary values', () => {
    for (const source of [
      '0.01',
      '0.29',
      '1.01',
      '1000000.99',
      '90071992547409.90',
      '90071992547409.91',
    ]) {
      const [whole = '0', fraction = '0'] = source.split('.');
      const expected = BigInt(whole) * 100n + BigInt(fraction);
      expect(BigInt(parseMoney(source))).toBe(expected);
    }
    expect(() => parseMoney('90071992547409.92')).toThrow();
  });
  it('matches an independent BigInt cash-flow oracle on 10000 synthetic rows', () => {
    const rows: Transaction[] = [];
    let input = 0n,
      output = 0n,
      fees = 0n,
      levies = 0n;
    for (let i = 0; i < 10000; i++) {
      const amount = (i * 37) % 100000;
      const fee = i % 117;
      const levy = i % 41;
      const direction = i % 3 === 0 ? 'in' : 'out';
      if (direction === 'in') input += BigInt(amount);
      else output += BigInt(amount);
      output += BigInt(fee) + BigInt(levy);
      fees += BigInt(fee);
      levies += BigInt(levy);
      rows.push({
        id: String(i),
        provider: 'generic',
        date: '2026-09-01T00:00:00.000Z',
        type: 'transfer',
        direction,
        amount: pesewas(amount),
        fee: pesewas(fee),
        levy: pesewas(levy),
        rawDescription: 'Synthetic transfer',
        categoryId: direction === 'in' ? 'transfers-received' : 'transfers-sent',
        categorySource: 'default',
      });
    }
    const actual = summarise(rows);
    expect(
      [actual.totalIn, actual.totalOut, actual.net, actual.totalFees, actual.totalLevy].map(BigInt),
    ).toEqual([input, output, input - output, fees, levies]);
    expect(actual.categoryTotals.reduce((sum, row) => sum + BigInt(row.amount), 0n)).toBe(output);
  });
});
