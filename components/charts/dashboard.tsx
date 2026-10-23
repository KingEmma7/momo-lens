'use client';
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Transaction } from '@/lib/parsers/types';
import { summarise } from '@/lib/analytics';
import type { View } from '@/lib/ui-types';
import { currency, shortDate, monthLabel } from '@/components/ui/shared';
import { TransactionLedger } from '@/components/review/review-screen';

const MonthlyChart = dynamic(() => import('@/components/charts/monthly-chart'), {
  ssr: false,
  loading: () => <p role="status">Loading chart…</p>,
});

export function Dashboard({
  transactions,
  navigate,
  sample,
  recategorise,
}: {
  transactions: Transaction[];
  navigate: (v: View) => void;
  sample: boolean;
  recategorise?: (id: string, categoryId: string, all: boolean) => void;
}) {
  const [period, setPeriod] = useState('all');
  const [monthTable, setMonthTable] = useState(false);
  const [categoryTable, setCategoryTable] = useState(false);
  const months = useMemo(
    () => [...new Set(transactions.map((transaction) => transaction.date.slice(0, 7)))].sort(),
    [transactions],
  );
  const filtered = useMemo(
    () =>
      transactions.filter((transaction) => period === 'all' || transaction.date.startsWith(period)),
    [transactions, period],
  );
  const stats = useMemo(() => summarise(filtered), [filtered]);
  const categories = stats.categoryTotals.filter((category) => category.amount > 0);
  const largestCategory = Math.max(1, ...categories.map((category) => category.amount));
  if (!transactions.length)
    return (
      <>
        <div className="ledger-heading">
          <h1>Let’s make sense of your MoMo.</h1>
          <p>Import a statement to see your transactions and totals.</p>
        </div>
        <button className="button primary" onClick={() => navigate('import')}>
          Import statement
        </button>
      </>
    );
  return (
    <>
      <div className="ledger-heading">
        <div>
          <h1>Your money, at a glance.</h1>
          <p>
            {sample
              ? 'Synthetic sample data. Import your statement to see your own figures.'
              : 'Transactions and totals from your imported statements.'}
          </p>
        </div>
        <label className="form-label">
          Statement period
          <select
            aria-label="Statement period"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="all">All time</option>
            {months.map((month) => (
              <option key={month} value={month}>
                {monthLabel(month)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="ledger-period">
        {shortDate(stats.periodStart)} to {shortDate(stats.periodEnd)} · {filtered.length}{' '}
        transactions
      </p>
      <dl className="ledger-figures">
        <div>
          <dt>Money in</dt>
          <dd>{currency(stats.totalIn)}</dd>
        </div>
        <div>
          <dt>Money out</dt>
          <dd>{currency(stats.totalOut)}</dd>
        </div>
        <div>
          <dt>Net</dt>
          <dd>{currency(stats.net)}</dd>
        </div>
      </dl>
      <section className="ledger-section" aria-labelledby="overview-transactions">
        <div className="ledger-section-heading">
          <h2 id="overview-transactions">Transactions</h2>
          <button className="small-text-button" onClick={() => navigate('review')}>
            Edit categories
          </button>
        </div>
        <TransactionLedger transactions={filtered} recategorise={recategorise} />
      </section>
      <section className="ledger-section" aria-labelledby="monthly-heading">
        <div className="ledger-section-heading">
          <h2 id="monthly-heading">Monthly money in and out</h2>
          <button
            className="small-text-button"
            onClick={() => setMonthTable(!monthTable)}
            aria-expanded={monthTable}
          >
            {monthTable ? 'View chart' : 'View as table'}
          </button>
        </div>
        <p>
          Across {stats.months.length} months, {currency(stats.totalIn)} came in and{' '}
          {currency(stats.totalOut)} went out. Money out includes fees and levies.
        </p>
        {monthTable ? (
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable table">
            <table className="data-table">
              <caption>Monthly money in and out, including fees</caption>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Money in</th>
                  <th scope="col">Money out</th>
                  <th scope="col">Net</th>
                </tr>
              </thead>
              <tbody>
                {stats.months.map((month) => (
                  <tr key={month.month}>
                    <th scope="row">{monthLabel(month.month)}</th>
                    <td>{currency(month.incoming)}</td>
                    <td>{currency(month.outgoing)}</td>
                    <td>{currency(month.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <MonthlyChart data={stats.months} />
          </>
        )}
      </section>
      <section className="ledger-section" aria-labelledby="category-heading">
        <div className="ledger-section-heading">
          <h2 id="category-heading">Spending by category</h2>
          <button
            className="small-text-button"
            onClick={() => setCategoryTable(!categoryTable)}
            aria-expanded={categoryTable}
          >
            {categoryTable ? 'View chart' : 'View as table'}
          </button>
        </div>
        <p>Categories total {currency(stats.totalOut)}, including explicit fees and levies.</p>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="data-table">
            <caption>Outgoing categories</caption>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Amount</th>
                <th scope="col">Share</th>
                {!categoryTable && <th scope="col">Relative amount</th>}
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <th scope="row">{category.label}</th>
                  <td>{currency(category.amount)}</td>
                  <td>
                    {stats.totalOut ? Math.round((category.amount / stats.totalOut) * 100) : 0}%
                  </td>
                  {!categoryTable && (
                    <td
                      aria-label={`${Math.round((category.amount / largestCategory) * 100)}% of largest category`}
                    >
                      <div className="ledger-bar-track">
                        <span
                          className="ledger-bar-fill"
                          style={{
                            display: 'block',
                            height: 4,
                            width: `${(category.amount / largestCategory) * 100}%`,
                            background: '#A87B00',
                          }}
                        />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="ledger-section" aria-labelledby="mobile-spend-heading">
        <h2 id="mobile-spend-heading">Data, airtime and charges</h2>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="data-table">
            <caption>Mobile spending and explicit charges</caption>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Data bundles</th>
                <td>{currency(stats.dataSpend)}</td>
              </tr>
              <tr>
                <th scope="row">Airtime</th>
                <td>{currency(stats.airtimeSpend)}</td>
              </tr>
              <tr>
                <th scope="row">Fees</th>
                <td>{currency(stats.totalFees)}</td>
              </tr>
              <tr>
                <th scope="row">Levies</th>
                <td>{currency(stats.totalLevy)}</td>
              </tr>
              <tr>
                <th scope="row">Fees & levies</th>
                <td>{currency(stats.totalFees + stats.totalLevy)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section className="ledger-section" aria-labelledby="recipients-heading">
        <h2 id="recipients-heading">Top recipients</h2>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="data-table">
            <caption>Up to ten recipients, ranked by transfer amount</caption>
            <thead>
              <tr>
                <th scope="col">Recipient</th>
                <th scope="col">Transfers</th>
                <th scope="col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {stats.recipients.map((person) => (
                <tr key={person.name}>
                  <th scope="row">{person.name}</th>
                  <td>{person.count}</td>
                  <td>{currency(person.amount)}</td>
                </tr>
              ))}
              {!stats.recipients.length && (
                <tr>
                  <td colSpan={3}>No outgoing transfers in this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="ledger-section" aria-labelledby="senders-heading">
        <h2 id="senders-heading">Top senders</h2>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="data-table">
            <caption>Up to ten senders, ranked by transfer amount</caption>
            <thead>
              <tr>
                <th scope="col">Sender</th>
                <th scope="col">Transfers</th>
                <th scope="col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {stats.senders.map((person) => (
                <tr key={person.name}>
                  <th scope="row">{person.name}</th>
                  <td>{person.count}</td>
                  <td>{currency(person.amount)}</td>
                </tr>
              ))}
              {!stats.senders.length && (
                <tr>
                  <td colSpan={3}>No incoming transfers in this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="ledger-section" aria-labelledby="biggest-spends-heading">
        <h2 id="biggest-spends-heading">Biggest single spends</h2>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="data-table">
            <caption>Up to five outgoing transactions, ranked by principal amount</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Transaction</th>
                <th scope="col">Amount</th>
                <th scope="col">Fees & levies</th>
              </tr>
            </thead>
            <tbody>
              {stats.biggestSpends.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{shortDate(transaction.date)}</td>
                  <th scope="row">{transaction.counterpartyName || transaction.rawDescription}</th>
                  <td>{currency(transaction.amount)}</td>
                  <td>{currency(transaction.fee + transaction.levy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="ledger-actions">
        <button className="button outline" onClick={() => navigate('review')}>
          See all transactions
        </button>
        <button className="button outline" onClick={() => navigate('wrapped')}>
          Create MoMo Wrapped
        </button>
      </div>
    </>
  );
}
