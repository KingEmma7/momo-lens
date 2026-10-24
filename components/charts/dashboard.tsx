'use client';
import { useI18n, TranslatedText } from '@/lib/i18n/react';
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Transaction } from '@/lib/parsers/types';
import { summarise } from '@/lib/analytics';
import type { View } from '@/lib/ui-types';
import { currency, shortDate, monthLabel } from '@/components/ui/shared';
import { TransactionLedger } from '@/components/review/review-screen';

function ChartLoading() {
  const { t } = useI18n();
  return (
    <p role="status">
      <TranslatedText text={t('Loading chart…')} />
    </p>
  );
}

const MonthlyChart = dynamic(() => import('@/components/charts/monthly-chart'), {
  ssr: false,
  loading: ChartLoading,
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
  const { t } = useI18n();
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
          <h1>
            <TranslatedText text={t('Let’s make sense of your MoMo.')} />
          </h1>
          <p>
            <TranslatedText text={t('Import a statement to see your transactions and totals.')} />
          </p>
        </div>
        <button className="button primary" onClick={() => navigate('import')}>
          <TranslatedText text={t('Import statement')} />
        </button>
      </>
    );
  return (
    <>
      <div className="ledger-heading">
        <div>
          <h1>
            <TranslatedText text={t('Your money, at a glance.')} />
          </h1>
          <p>
            <TranslatedText
              text={
                sample
                  ? t('Synthetic sample data. Import your statement to see your own figures.')
                  : t('Transactions and totals from your imported statements.')
              }
            />
          </p>
        </div>
        <label className="form-label">
          <TranslatedText text={t('Statement period')} />
          <select
            aria-label={t('Statement period')}
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="all">
              <TranslatedText text={t('All time')} />
            </option>
            {months.map((month) => (
              <option key={month} value={month}>
                {monthLabel(month)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="ledger-period">
        <TranslatedText
          text={t('{start} to {end} · {count} transactions', {
            start: shortDate(stats.periodStart),
            end: shortDate(stats.periodEnd),
            count: filtered.length,
          })}
        />
      </p>
      <dl className="ledger-figures">
        <div>
          <dt>
            <TranslatedText text={t('Money in')} />
          </dt>
          <dd>{currency(stats.totalIn)}</dd>
        </div>
        <div>
          <dt>
            <TranslatedText text={t('Money out')} />
          </dt>
          <dd>{currency(stats.totalOut)}</dd>
        </div>
        <div>
          <dt>
            <TranslatedText text={t('Net')} />
          </dt>
          <dd>{currency(stats.net)}</dd>
        </div>
      </dl>
      <section className="ledger-section" aria-labelledby="overview-transactions">
        <div className="ledger-section-heading">
          <h2 id="overview-transactions">
            <TranslatedText text={t('Transactions')} />
          </h2>
          <button className="small-text-button" onClick={() => navigate('review')}>
            <TranslatedText text={t('Edit categories')} />
          </button>
        </div>
        <TransactionLedger transactions={filtered} recategorise={recategorise} />
      </section>
      <section className="ledger-section" aria-labelledby="monthly-heading">
        <div className="ledger-section-heading">
          <h2 id="monthly-heading">
            <TranslatedText text={t('Monthly money in and out')} />
          </h2>
          <button
            className="small-text-button"
            onClick={() => setMonthTable(!monthTable)}
            aria-expanded={monthTable}
          >
            <TranslatedText text={monthTable ? t('View chart') : t('View as table')} />
          </button>
        </div>
        <p>
          <TranslatedText
            text={t(
              'Across {months} months, {incoming} came in and {outgoing} went out. Money out includes fees and levies.',
              {
                months: stats.months.length,
                incoming: currency(stats.totalIn),
                outgoing: currency(stats.totalOut),
              },
            )}
          />
        </p>
        {monthTable ? (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label={t('Scrollable table')}
          >
            <table className="data-table">
              <caption>
                <TranslatedText text={t('Monthly money in and out, including fees')} />
              </caption>
              <thead>
                <tr>
                  <th scope="col">
                    <TranslatedText text={t('Month')} />
                  </th>
                  <th scope="col">
                    <TranslatedText text={t('Money in')} />
                  </th>
                  <th scope="col">
                    <TranslatedText text={t('Money out')} />
                  </th>
                  <th scope="col">
                    <TranslatedText text={t('Net')} />
                  </th>
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
          <h2 id="category-heading">
            <TranslatedText text={t('Spending by category')} />
          </h2>
          <button
            className="small-text-button"
            onClick={() => setCategoryTable(!categoryTable)}
            aria-expanded={categoryTable}
          >
            <TranslatedText text={categoryTable ? t('View chart') : t('View as table')} />
          </button>
        </div>
        <p>
          <TranslatedText
            text={t('Categories total {amount}, including explicit fees and levies.', {
              amount: currency(stats.totalOut),
            })}
          />
        </p>
        <div className="table-scroll" tabIndex={0} role="region" aria-label={t('Scrollable table')}>
          <table className="data-table">
            <caption>
              <TranslatedText text={t('Outgoing categories')} />
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <TranslatedText text={t('Category')} />
                </th>
                <th scope="col">
                  <TranslatedText text={t('Amount')} />
                </th>
                <th scope="col">
                  <TranslatedText text={t('Share')} />
                </th>
                {!categoryTable && (
                  <th scope="col">
                    <TranslatedText text={t('Relative amount')} />
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <th scope="row">
                    <TranslatedText text={t(category.labelKey)} />
                  </th>
                  <td>{currency(category.amount)}</td>
                  <td>
                    {stats.totalOut ? Math.round((category.amount / stats.totalOut) * 100) : 0}
                    <TranslatedText text={t('%')} />
                  </td>
                  {!categoryTable && (
                    <td
                      aria-label={t('{value1}% of largest category', {
                        value1: Math.round((category.amount / largestCategory) * 100),
                      })}
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
        <h2 id="mobile-spend-heading">
          <TranslatedText text={t('Data, airtime and charges')} />
        </h2>
        <div className="table-scroll" tabIndex={0} role="region" aria-label={t('Scrollable table')}>
          <table className="data-table">
            <caption>
              <TranslatedText text={t('Mobile spending and explicit charges')} />
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <TranslatedText text={t('Item')} />
                </th>
                <th scope="col">
                  <TranslatedText text={t('Amount')} />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  <TranslatedText text={t('Data bundles')} />
                </th>
                <td>{currency(stats.dataSpend)}</td>
              </tr>
              <tr>
                <th scope="row">
                  <TranslatedText text={t('Airtime')} />
                </th>
                <td>{currency(stats.airtimeSpend)}</td>
              </tr>
              <tr>
                <th scope="row">
                  <TranslatedText text={t('Fees')} />
                </th>
                <td>{currency(stats.totalFees)}</td>
              </tr>
              <tr>
                <th scope="row">
                  <TranslatedText text={t('Levies')} />
                </th>
                <td>{currency(stats.totalLevy)}</td>
              </tr>
              <tr>
                <th scope="row">
                  <TranslatedText text={t('Fees & levies')} />
                </th>
                <td>{currency(stats.totalFees + stats.totalLevy)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section className="ledger-section" aria-labelledby="recipients-heading">
        <h2 id="recipients-heading">
          <TranslatedText text={t('Top recipients')} />
        </h2>
        <div className="table-scroll" tabIndex={0} role="region" aria-label={t('Scrollable table')}>
          <table className="data-table">
            <caption>
              <TranslatedText text={t('Up to ten recipients, ranked by transfer amount')} />
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <TranslatedText text={t('Recipient')} />
                </th>
                <th scope="col">
                  <TranslatedText text={t('Transfers')} />
                </th>
                <th scope="col">
                  <TranslatedText text={t('Amount')} />
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.recipients.map((person) => (
                <tr key={person.key}>
                  <th scope="row">{person.name}</th>
                  <td>{person.count}</td>
                  <td>{currency(person.amount)}</td>
                </tr>
              ))}
              {!stats.recipients.length && (
                <tr>
                  <td colSpan={3}>
                    <TranslatedText text={t('No outgoing transfers in this period.')} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="ledger-section" aria-labelledby="senders-heading">
        <h2 id="senders-heading">
          <TranslatedText text={t('Top senders')} />
        </h2>
        <div className="table-scroll" tabIndex={0} role="region" aria-label={t('Scrollable table')}>
          <table className="data-table">
            <caption>
              <TranslatedText text={t('Up to ten senders, ranked by transfer amount')} />
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <TranslatedText text={t('Sender')} />
                </th>
                <th scope="col">
                  <TranslatedText text={t('Transfers')} />
                </th>
                <th scope="col">
                  <TranslatedText text={t('Amount')} />
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.senders.map((person) => (
                <tr key={person.key}>
                  <th scope="row">{person.name}</th>
                  <td>{person.count}</td>
                  <td>{currency(person.amount)}</td>
                </tr>
              ))}
              {!stats.senders.length && (
                <tr>
                  <td colSpan={3}>
                    <TranslatedText text={t('No incoming transfers in this period.')} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="ledger-section" aria-labelledby="biggest-spends-heading">
        <h2 id="biggest-spends-heading">
          <TranslatedText text={t('Biggest single spends')} />
        </h2>
        <div className="table-scroll" tabIndex={0} role="region" aria-label={t('Scrollable table')}>
          <table className="data-table">
            <caption>
              <TranslatedText
                text={t('Up to five outgoing transactions, ranked by principal amount')}
              />
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <TranslatedText text={t('Date')} />
                </th>
                <th scope="col">
                  <TranslatedText text={t('Transaction')} />
                </th>
                <th scope="col">
                  <TranslatedText text={t('Amount')} />
                </th>
                <th scope="col">
                  <TranslatedText text={t('Fees & levies')} />
                </th>
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
          <TranslatedText text={t('See all transactions')} />
        </button>
        <button className="button outline" onClick={() => navigate('wrapped')}>
          <TranslatedText text={t('Create MoMo Wrapped')} />
        </button>
      </div>
    </>
  );
}
