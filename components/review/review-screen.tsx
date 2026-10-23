'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Transaction, ImportSession } from '@/lib/parsers/types';
import { CATEGORIES } from '@/lib/categorise/defaults';
import type { View } from '@/lib/ui-types';
import { currency, shortDate, monthLabel, Empty, PageHeading } from '@/components/ui/shared';

type Recategorise = (id: string, category: string, all: boolean) => void;
type SortColumn = 'date' | 'counterparty' | 'category' | 'amount';
type SortDirection = 'ascending' | 'descending';
const categoryLabels = new Map(CATEGORIES.map((category) => [category.id, category.label]));
const collator = new Intl.Collator('en-GH', { sensitivity: 'base', numeric: true });

function counterparty(transaction: Transaction): string {
  return (
    transaction.counterpartyName || transaction.counterpartyMasked || transaction.rawDescription
  );
}

function compareTransactions(left: Transaction, right: Transaction, column: SortColumn): number {
  if (column === 'date') return left.date.localeCompare(right.date);
  if (column === 'counterparty') return collator.compare(counterparty(left), counterparty(right));
  if (column === 'category') {
    return collator.compare(
      categoryLabels.get(left.categoryId) || left.categoryId,
      categoryLabels.get(right.categoryId) || right.categoryId,
    );
  }
  const leftAmount = left.direction === 'in' ? left.amount : -left.amount;
  const rightAmount = right.direction === 'in' ? right.amount : -right.amount;
  return leftAmount - rightAmount;
}

/** Shared by the overview and full review. No imported rows are copied into a remote table. */
export function TransactionLedger({
  transactions,
  recategorise,
}: {
  transactions: Transaction[];
  recategorise?: Recategorise;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [type, setType] = useState('all');
  const [month, setMonth] = useState('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('descending');
  const [edit, setEdit] = useState<Transaction>();
  const [editCategory, setEditCategory] = useState('');
  const [applyAll, setApplyAll] = useState(false);
  const filtered = useMemo(
    () =>
      transactions
        .filter(
          (transaction) =>
            (category === 'all' || transaction.categoryId === category) &&
            (type === 'all' || transaction.type === type) &&
            (month === 'all' || transaction.date.startsWith(month)) &&
            `${transaction.rawDescription} ${transaction.counterpartyName || ''} ${transaction.counterpartyMasked || ''} ${transaction.reference || ''}`
              .toLocaleLowerCase('en')
              .includes(search.trim().toLocaleLowerCase('en')),
        )
        .sort((left, right) => {
          const compared = compareTransactions(left, right, sortColumn);
          if (compared) return sortDirection === 'ascending' ? compared : -compared;
          return right.date.localeCompare(left.date) || left.id.localeCompare(right.id);
        }),
    [transactions, search, category, type, month, sortColumn, sortDirection],
  );
  const months = useMemo(
    () => [...new Set(transactions.map((transaction) => transaction.date.slice(0, 7)))].sort(),
    [transactions],
  );
  const types = useMemo(
    () => [...new Set(transactions.map((transaction) => transaction.type))].sort(),
    [transactions],
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtual = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 80,
    overscan: 8,
  });
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [search, category, type, month, sortColumn, sortDirection]);

  function sortBy(column: SortColumn): void {
    if (column === sortColumn)
      setSortDirection((direction) => (direction === 'ascending' ? 'descending' : 'ascending'));
    else {
      setSortColumn(column);
      setSortDirection(column === 'date' ? 'descending' : 'ascending');
    }
  }
  function openEdit(transaction: Transaction): void {
    setEdit(transaction);
    setEditCategory(transaction.categoryId);
    setApplyAll(false);
  }
  function header(column: SortColumn, label: string) {
    const active = column === sortColumn;
    return (
      <div role="columnheader" aria-sort={active ? sortDirection : 'none'} key={column}>
        <button
          type="button"
          className="ledger-sort"
          onClick={() => sortBy(column)}
          aria-label={`Sort by ${label.toLowerCase()}`}
        >
          <span>{label}</span>
          {active && (
            <span className="ledger-sort-state">
              {sortDirection === 'ascending' ? 'Ascending' : 'Descending'}
            </span>
          )}
        </button>
      </div>
    );
  }
  function row(transaction: Transaction, index: number, style?: CSSProperties) {
    const label = categoryLabels.get(transaction.categoryId) || transaction.categoryId;
    return (
      <div
        role="row"
        aria-rowindex={index + 2}
        className="transaction-row ledger-row"
        data-transaction-id={transaction.id}
        key={transaction.id}
        style={style}
      >
        <div role="cell" className="transaction-date">
          <time dateTime={transaction.date}>{shortDate(transaction.date)}</time>
          <small>
            {transaction.provider === 'mtn-gh'
              ? 'MTN MoMo'
              : transaction.provider === 'telecel-gh'
                ? 'Telecel Cash'
                : 'CSV import'}
          </small>
        </div>
        <div role="cell" className="transaction-description">
          <span>
            <strong>{transaction.counterpartyName || transaction.rawDescription}</strong>
            <small>
              {transaction.counterpartyName
                ? transaction.rawDescription
                : transaction.counterpartyMasked || transaction.reference || 'No reference'}
              {transaction.counterpartyName && transaction.counterpartyMasked
                ? ` · ${transaction.counterpartyMasked}`
                : ''}
            </small>
          </span>
        </div>
        <div role="cell">
          {recategorise ? (
            <button
              type="button"
              className="ledger-category"
              aria-label={`Change category for ${transaction.counterpartyName || transaction.rawDescription}`}
              onClick={() => openEdit(transaction)}
            >
              {label}
            </button>
          ) : (
            label
          )}
        </div>
        <div role="cell" className="transaction-amount">
          <span className="visually-hidden">
            {transaction.direction === 'in' ? 'Money in: ' : 'Money out: '}
          </span>
          {transaction.direction === 'in' ? '+' : '−'}
          {currency(transaction.amount)}
          {transaction.fee + transaction.levy > 0 && (
            <small>+ {currency(transaction.fee + transaction.levy)} fees & levies</small>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="ledger" aria-label="Transaction ledger">
      <div className="review-toolbar ledger-toolbar">
        <label className="search-box">
          <span className="visually-hidden">Search transactions</span>
          <input
            aria-label="Search transactions"
            placeholder="Search a name, number or reference"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="filter-label ledger-filter">
          <span>Category</span>
          <select
            aria-label="Category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-label ledger-filter">
          <span>Type</span>
          <select aria-label="Type" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">All types</option>
            {types.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll('-', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-label ledger-filter">
          <span>Month</span>
          <select
            aria-label="Month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          >
            <option value="all">All months</option>
            {months.map((item) => (
              <option key={item} value={item}>
                {monthLabel(item)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="review-count ledger-count">
        <span role="status" aria-live="polite">
          {filtered.length} of {transactions.length} transactions
        </span>
        {recategorise && <span>Select a category to change it</span>}
      </div>
      <p className="ledger-scroll-hint">Scroll sideways to see categories and amounts.</p>
      <div
        className="transactions-scroll"
        ref={scrollRef}
        tabIndex={0}
        aria-label="Scrollable transactions"
      >
        <div
          role="table"
          aria-label="Transactions"
          aria-rowcount={filtered.length + 1}
          aria-colcount={4}
          className="transactions-table ledger-table"
        >
          <div role="rowgroup">
            <div role="row" className="transaction-table-head ledger-head">
              {header('date', 'Date')}
              {header('counterparty', 'Counterparty')}
              {header('category', 'Category')}
              {header('amount', 'Amount')}
            </div>
          </div>
          <div
            role="rowgroup"
            style={
              filtered.length > 100
                ? { height: virtual.getTotalSize(), position: 'relative' }
                : undefined
            }
          >
            {filtered.length > 100
              ? virtual.getVirtualItems().map((item) => {
                  const transaction = filtered[item.index];
                  return transaction
                    ? row(transaction, item.index, {
                        position: 'absolute',
                        width: '100%',
                        top: 0,
                        left: 0,
                        transform: `translateY(${item.start}px)`,
                        height: item.size,
                      })
                    : null;
                })
              : filtered.map((transaction, index) => row(transaction, index))}
          </div>
        </div>
        {!filtered.length && (
          <div className="filter-empty">
            <h3>
              {transactions.length ? 'No transactions match.' : 'No transactions to display.'}
            </h3>
            <p>
              {transactions.length
                ? 'Try another name or clear your filters.'
                : 'Import a statement to see its transactions.'}
            </p>
            {transactions.length > 0 && (
              <button
                type="button"
                className="button outline"
                onClick={() => {
                  setSearch('');
                  setCategory('all');
                  setType('all');
                  setMonth('all');
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
      <Dialog.Root
        open={Boolean(edit)}
        onOpenChange={(open) => {
          if (!open) setEdit(undefined);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <div className="dialog-top">
              <Dialog.Title>Change category</Dialog.Title>
              <Dialog.Close className="button outline compact" aria-label="Close category editor">
                Close
              </Dialog.Close>
            </div>
            <Dialog.Description>Choose a category for this transaction.</Dialog.Description>
            <p className="editing-name">{edit?.counterpartyName || edit?.rawDescription}</p>
            <label className="form-label">
              Transaction category
              <select
                aria-label="Transaction category"
                value={editCategory}
                onChange={(event) => setEditCategory(event.target.value)}
              >
                {CATEGORIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            {(edit?.counterpartyName || edit?.counterpartyMasked) && (
              <label className="remember-option">
                <input
                  type="checkbox"
                  checked={applyAll}
                  onChange={(event) => setApplyAll(event.target.checked)}
                />
                <span>
                  <strong>Apply to all from this counterparty</strong>
                  <small>Creates a rule for matching transactions, including future imports.</small>
                </span>
              </label>
            )}
            <button
              type="button"
              className="button primary full"
              onClick={() => {
                if (edit && recategorise) recategorise(edit.id, editCategory, applyAll);
                setEdit(undefined);
              }}
            >
              Save category
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

export const LedgerTable = TransactionLedger;

export function Review({
  transactions,
  recategorise,
  session,
  navigate,
}: {
  transactions: Transaction[];
  recategorise: Recategorise;
  session: ImportSession | undefined;
  navigate: (view: View) => void;
}) {
  const [skippedLimit, setSkippedLimit] = useState(100);
  useEffect(() => {
    setSkippedLimit(100);
  }, [session?.id]);
  return (
    <>
      <PageHeading title="Transactions" description="Search, sort and change categories.">
        <button
          type="button"
          className="button outline compact"
          onClick={() => navigate('dashboard')}
        >
          View overview
        </button>
      </PageHeading>
      {transactions.length ? (
        <TransactionLedger transactions={transactions} recategorise={recategorise} />
      ) : (
        <Empty
          title="No transactions yet."
          description="Import a statement to see its transactions."
          navigate={navigate}
        />
      )}
      {session && (
        <section className="import-report" aria-label="Import summary">
          <h2>Import summary</h2>
          <p>
            {session.parsedCount} rows read from <strong>{session.fileName}</strong>.{' '}
            {session.skippedRows.length} rows skipped.
          </p>
          {session.warnings.map((warning, index) => (
            <p key={index} className="warning-text">
              {warning}
            </p>
          ))}
          {session.skippedRows.length > 0 && (
            <details>
              <summary>View skipped rows and reasons</summary>
              <ul>
                {session.skippedRows.slice(0, skippedLimit).map((item, index) => (
                  <li key={index}>
                    Row {item.row}: {item.reason}
                  </li>
                ))}
              </ul>
              {skippedLimit < session.skippedRows.length && (
                <button
                  type="button"
                  className="button outline"
                  onClick={() => setSkippedLimit((limit) => limit + 100)}
                >
                  Show 100 more skipped rows
                </button>
              )}
            </details>
          )}
        </section>
      )}
    </>
  );
}
