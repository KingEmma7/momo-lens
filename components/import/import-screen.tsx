'use client';
import { useRef, useState, type ChangeEvent } from 'react';
import type { Settings, ParseResult, ColumnMapping } from '@/lib/parsers/types';
import { parseFile } from '@/lib/parse-client';
import { PageHeading, ProviderGuide } from '@/components/ui/shared';

export function ImportScreen({
  workerReady,
  onComplete,
  loadSample,
  sampleBusy,
  sampleError,
  settings,
  setSettings,
}: {
  workerReady: boolean;
  onComplete: (r: ParseResult) => void;
  loadSample: () => void;
  sampleBusy: boolean;
  sampleError: string;
  settings: Settings;
  setSettings: (s: Settings) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File>();
  const [mappingResult, setMappingResult] = useState<ParseResult>();
  const [mapping, setMapping] = useState<ColumnMapping>({ date: '', description: '' });
  const [password, setPassword] = useState('');
  const [passwordNeeded, setPasswordNeeded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const processFile = async (
    selected: File,
    options: { password?: string; mapping?: ColumnMapping } = {},
  ) => {
    setFile(selected);
    setBusy(true);
    setError('');
    setProgress(0);
    try {
      const result = await parseFile(selected, { ...options, onProgress: setProgress });
      setPasswordNeeded(false);
      setPassword('');
      if (result.needsMapping) {
        setMappingResult(result);
        setError('');
        return;
      }
      if (!result.transactions.length) {
        setError('No transactions were found. Try a CSV export, or check the statement period.');
        return;
      }
      onComplete(result);
    } catch (cause) {
      const code = cause && typeof cause === 'object' && 'code' in cause ? cause.code : '';
      if (code === 'PASSWORD_REQUIRED' || code === 'PASSWORD_INCORRECT') {
        setPasswordNeeded(true);
        if (code === 'PASSWORD_INCORRECT')
          setError('That password did not unlock this PDF. Try again.');
      } else
        setError(
          cause instanceof Error ? cause.message : 'This file could not be read. Try a CSV export.',
        );
    } finally {
      setBusy(false);
    }
  };
  const fileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) void processFile(selected);
    event.target.value = '';
  };
  return (
    <>
      <PageHeading
        title="Import statement"
        description="Read a PDF or CSV from MTN MoMo or Telecel Cash."
      />
      <div className="import-layout">
        <div>
          <section className="panel import-panel">
            <div className="panel-title">
              <h2>Choose your statement</h2>
              <span className="local-label">Only on this device</span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.pdf,text/csv,application/pdf"
              aria-label="Choose statement file"
              onChange={fileChange}
              disabled={!workerReady || busy}
              className="visually-hidden"
            />
            <div
              className={`dropzone ${dragging ? 'dragging' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const selected = e.dataTransfer.files[0];
                if (selected && workerReady && !busy) void processFile(selected);
              }}
            >
              <h3>{busy ? 'Reading your statement…' : 'Drop your statement here'}</h3>
              <p>
                {busy
                  ? 'Your file is being read privately on this device.'
                  : 'or choose a file from your phone or computer'}
              </p>
              {busy ? (
                <>
                  <progress max="100" value={progress} aria-label="Statement parsing progress" />
                  <p role="status">{Math.round(progress)}% read</p>
                </>
              ) : (
                <button
                  className="button primary"
                  disabled={!workerReady}
                  onClick={() => fileRef.current?.click()}
                >
                  Choose file
                </button>
              )}
              <span className="file-types">
                PDF or CSV <span>·</span> Up to 25 MB
              </span>
            </div>
            <p className="reader-status" role="status">
              {workerReady ? <>Ready to import</> : <>Getting your private file reader ready…</>}
            </p>
            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}
            {passwordNeeded && (
              <form
                className="password-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (file) void processFile(file, { password });
                }}
              >
                <label htmlFor="pdf-password">PDF password</label>
                <input
                  autoFocus
                  id="pdf-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                  required
                />
                <p>Your password only unlocks this file on your device.</p>
                <button className="button primary" disabled={busy}>
                  Unlock PDF
                </button>
              </form>
            )}
            {mappingResult && (
              <form
                className="mapping-wizard"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!mapping.amount && !mapping.debit && !mapping.credit) {
                    setError('Choose an amount column, or debit and credit columns.');
                    return;
                  }
                  if (file) void processFile(file, { mapping });
                }}
              >
                <div className="mapping-title">
                  <h3>Match your columns</h3>
                </div>
                <p>
                  This layout is new to us. Tell us which columns to use. Positive amounts are money
                  in; negative amounts are money out.
                </p>
                <div className="mapping-fields">
                  {(
                    [
                      'date',
                      'description',
                      'amount',
                      'debit',
                      'credit',
                      'balance',
                      'counterparty',
                    ] as const
                  ).map((key) => (
                    <label key={key}>
                      {key.charAt(0).toUpperCase() + key.slice(1)} column
                      <select
                        aria-label={`${key.charAt(0).toUpperCase() + key.slice(1)} column`}
                        value={mapping[key] || ''}
                        required={key === 'date' || key === 'description'}
                        onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                      >
                        <option value="">
                          {key === 'date' || key === 'description' ? 'Choose a column' : 'Not used'}
                        </option>
                        {mappingResult.columns?.map((column) => (
                          <option key={column}>{column}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <div
                  className="table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Scrollable table"
                >
                  <table className="data-table">
                    <caption>First rows from your file</caption>
                    <thead>
                      <tr>
                        {mappingResult.columns?.map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mappingResult.preview?.slice(0, 3).map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="button primary" disabled={busy}>
                  Finish import
                </button>
              </form>
            )}
            <label className="remember-option">
              <input
                type="checkbox"
                checked={settings.rememberOnDevice}
                onChange={(e) => setSettings({ ...settings, rememberOnDevice: e.target.checked })}
              />
              <span>
                <strong>Remember on this device</strong>
                <small>Optional. Otherwise your data disappears when you close this page.</small>
              </span>
            </label>
          </section>
          <section className="sample-panel">
            <span className="sample-panel-icon"></span>
            <div>
              <h3>Explore a sample statement</h3>
              <p>The sample contains synthetic transactions. Your saved data stays separate.</p>
            </div>
            <button className="button outline compact" onClick={loadSample} disabled={sampleBusy}>
              {sampleBusy ? 'Loading…' : 'Load sample data'}
            </button>
          </section>
          {sampleError && (
            <p className="error-message" role="alert">
              {sampleError}
            </p>
          )}
        </div>
        <aside className="import-help">
          <h2>Where do I find my statement?</h2>
          <ProviderGuide />
          <div className="help-note">
            <h3>You’re in control.</h3>
            <p>
              We read your statement inside your browser. Your file, password and transactions never
              leave this device.
            </p>
            <span>No connection to your MoMo account.</span>
          </div>
          <p className="support-note">
            Scanned PDF? Ask your provider for a text PDF or CSV. Photos cannot be read yet.
          </p>
        </aside>
      </div>
    </>
  );
}
