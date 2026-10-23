'use client';
import { useMemo, useState } from 'react';
import type { Transaction, Settings } from '@/lib/parsers/types';
import { summarise } from '@/lib/analytics';
import type { View } from '@/lib/ui-types';
import { currency, monthLabel, shortDate } from '@/components/ui/shared';

export function Wrapped({
  transactions,
  settings,
  setSettings,
  navigate,
  sample = false,
}: {
  transactions: Transaction[];
  settings: Settings;
  setSettings: (settings: Settings) => void;
  navigate: (view: View) => void;
  sample?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState('all');
  const stats = useMemo(
    () =>
      summarise(
        transactions.filter(
          (transaction) => period === 'all' || transaction.date.startsWith(period),
        ),
      ),
    [transactions, period],
  );
  const topCategory = stats.categoryTotals.filter((category) => category.id !== 'fees')[0];
  const hidden = settings.hideAmountsInShare;
  const namesHidden = settings.hideNamesInShare ?? true;
  const recipient = stats.recipients[0]?.name;
  const periodText =
    stats.periodStart && stats.periodEnd
      ? `${shortDate(stats.periodStart)} to ${shortDate(stats.periodEnd)}`
      : 'No transactions in this period';
  const entries = [
    ['Top category', topCategory?.label || 'No outgoing spending'],
    ['Data bundles', hidden ? 'Hidden' : currency(stats.dataSpend)],
    ['Transfers', String(stats.transferCount)],
    ['Fees & levies', hidden ? 'Hidden' : currency(stats.totalFees + stats.totalLevy)],
  ];
  if (!transactions.length)
    return (
      <>
        <div className="ledger-heading">
          <h1>Your Wrapped is waiting.</h1>
          <p>Import a statement to create a summary.</p>
        </div>
        <button className="button primary" onClick={() => navigate('import')}>
          Import statement
        </button>
      </>
    );
  const generate = async (fallback = false) => {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await document.fonts.ready;
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      const family = window.getComputedStyle(document.body).fontFamily;
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, 1080, 1350);
      context.fillStyle = '#141414';
      context.font = `600 34px ${family}`;
      context.fillText('momolens.', 78, 108);
      context.font = `600 64px ${family}`;
      context.fillText('MoMo Wrapped', 78, 242);
      context.fillStyle = '#737373';
      context.font = `400 28px ${family}`;
      context.fillText(periodText, 78, 300, 924);
      if (sample) context.fillText('Synthetic sample', 78, 350, 924);
      const exportedEntries = [...entries];
      if (!namesHidden && recipient) exportedEntries.push(['Most sent to', recipient]);
      exportedEntries.forEach(([label, value], index) => {
        const top = 398 + index * 144;
        context.strokeStyle = '#D9D9D9';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(78, top);
        context.lineTo(1002, top);
        context.stroke();
        context.fillStyle = '#737373';
        context.font = `400 27px ${family}`;
        context.fillText(label || '', 78, top + 43);
        context.fillStyle = '#141414';
        context.font = `600 42px ${family}`;
        context.fillText(value || '', 78, top + 103, 924);
      });
      context.strokeStyle = '#D9D9D9';
      context.beginPath();
      context.moveTo(78, 1185);
      context.lineTo(1002, 1185);
      context.stroke();
      context.fillStyle = '#737373';
      context.font = `400 23px ${family}`;
      context.fillText(
        hidden && namesHidden
          ? 'Names and exact amounts are hidden.'
          : 'Shared with the privacy settings selected by me.',
        78,
        1232,
        924,
      );
      context.fillText('Made with MoMo Lens', 78, 1280);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error('PNG failed'))),
          'image/png',
        ),
      );
      const file = new File([blob], 'my-momo-wrapped.png', { type: 'image/png' });
      if (!fallback && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'My MoMo Wrapped' });
          setStatus('Your Wrapped is ready to share.');
          return;
        } catch (cause) {
          if (cause instanceof DOMException && cause.name === 'AbortError') {
            setStatus('Sharing cancelled. You can download your card anytime.');
            return;
          }
        }
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'my-momo-wrapped.png';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('Your Wrapped PNG has been downloaded.');
    } catch {
      setError(
        'Your summary could not be created. Try the download again, or use your browser’s screenshot option.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="ledger-heading">
        <h1>Meet your MoMo Wrapped.</h1>
        <p>A summary of the selected period. Names and exact amounts are hidden by default.</p>
      </div>
      <div className="wrapped-layout">
        <div className="wrapped-preview-zone">
          <article className="wrapped-card" aria-label="MoMo Wrapped share card">
            <div className="wrapped-card-top">momolens.</div>
            <h2>MoMo Wrapped</h2>
            <p className="wrapped-period">{periodText}</p>
            {sample && <p>Synthetic sample</p>}
            <dl className="wrapped-summary-table">
              {entries.map(([label, value]) => (
                <div className="wrapped-stat" key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              {!namesHidden && recipient && (
                <div className="wrapped-stat">
                  <dt>Most sent to</dt>
                  <dd>{recipient}</dd>
                </div>
              )}
            </dl>
            <div className="wrapped-card-bottom">
              <p>
                {hidden && namesHidden
                  ? 'Names and exact amounts are hidden.'
                  : 'Shared with the privacy settings selected by me.'}
              </p>
              <p>Made with MoMo Lens</p>
            </div>
          </article>
        </div>
        <aside className="wrapped-controls">
          <h2>Export settings</h2>
          <label className="form-label">
            Period
            <select
              aria-label="Wrapped period"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <option value="all">All time</option>
              {[...new Set(transactions.map((transaction) => transaction.date.slice(0, 7)))]
                .sort()
                .map((month) => (
                  <option key={month} value={month}>
                    {monthLabel(month)}
                  </option>
                ))}
            </select>
          </label>
          <div className="privacy-toggles">
            <label className="toggle-row">
              <span>
                <strong>Hide amounts</strong>
                <small>Keep exact amounts private</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={hidden}
                aria-label="Hide amounts"
                onChange={(event) =>
                  setSettings({ ...settings, hideAmountsInShare: event.target.checked })
                }
              />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Hide names</strong>
                <small>Keep counterparty names private</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={namesHidden}
                aria-label="Hide names"
                onChange={(event) =>
                  setSettings({ ...settings, hideNamesInShare: event.target.checked })
                }
              />
            </label>
          </div>
          <p className="share-privacy-note">
            {hidden && namesHidden
              ? 'Names and exact amounts are hidden. Transfer counts and category labels will be visible.'
              : 'Your summary may show names or exact amounts. Check the preview before sharing.'}
          </p>
          <button className="button primary full" disabled={busy} onClick={() => void generate()}>
            {busy ? 'Creating PNG…' : 'Download PNG'}
          </button>
          <p className="export-note">Share directly on supported phones, or download the PNG.</p>
          {status && (
            <p role="status" className="success-message">
              {status}
            </p>
          )}
          {error && (
            <div className="error-message" role="alert">
              {error}
              <button className="button outline" onClick={() => void generate(true)}>
                Try fallback download
              </button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
