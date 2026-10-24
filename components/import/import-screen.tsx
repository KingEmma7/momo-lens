'use client';
import { useI18n, TranslatedText } from '@/lib/i18n/react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { Settings, ParseResult, ColumnMapping } from '@/lib/parsers/types';
import { mappingColumnKeys } from '@/lib/i18n';
import { closeParser, parseFile, warmParser } from '@/lib/parse-client';
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
  const { t, translateSystemMessage } = useI18n();
  const [busy, setBusy] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const requestId = useRef(0);
  const activeParsing = useRef(false);
  useEffect(
    () => () => {
      if (activeParsing.current) {
        ++requestId.current;
        closeParser();
      }
    },
    [],
  );
  const cancelParsing = () => {
    ++requestId.current;
    activeParsing.current = false;
    closeParser();
    setBusy(false);
    setProgress(0);
    setError(t('Reading cancelled. Choose a statement to try again.'));
    setRestarting(true);
    void warmParser().then(
      () => setRestarting(false),
      () => {
        setError(t('The file reader could not restart. Refresh this page and try again.'));
      },
    );
  };
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
    const request = ++requestId.current;
    activeParsing.current = true;
    setFile(selected);
    setBusy(true);
    setError('');
    setProgress(0);
    try {
      const result = await parseFile(selected, {
        ...options,
        onProgress: (value) => {
          if (request === requestId.current) setProgress(value);
        },
      });
      if (request !== requestId.current) return;
      setPasswordNeeded(false);
      setPassword('');
      if (result.needsMapping) {
        setMappingResult(result);
        setError('');
        return;
      }
      if (!result.transactions.length) {
        setError(t('No transactions were found. Try a CSV export, or check the statement period.'));
        return;
      }
      activeParsing.current = false;
      onComplete(result);
    } catch (cause) {
      if (request !== requestId.current) return;
      const code = cause && typeof cause === 'object' && 'code' in cause ? cause.code : '';
      if (code === 'PASSWORD_REQUIRED' || code === 'PASSWORD_INCORRECT') {
        setPasswordNeeded(true);
        if (code === 'PASSWORD_INCORRECT')
          setError(t('That password did not unlock this PDF. Try again.'));
      } else
        setError(
          cause instanceof Error
            ? translateSystemMessage(cause.message)
            : t('This file could not be read. Try a CSV export.'),
        );
    } finally {
      if (request === requestId.current) {
        activeParsing.current = false;
        setBusy(false);
      }
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
        title={t('Import statement')}
        description={t('Read a PDF or CSV from MTN MoMo or Telecel Cash.')}
      />
      <div className="import-layout">
        <div>
          <section className="panel import-panel">
            <div className="panel-title">
              <h2>
                <TranslatedText text={t('Choose your statement')} />
              </h2>
              <span className="local-label">
                <TranslatedText text={t('Only on this device')} />
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.pdf,text/csv,application/pdf"
              aria-label={t('Choose statement file')}
              onChange={fileChange}
              disabled={!workerReady || restarting || busy}
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
                if (selected && workerReady && !restarting && !busy) void processFile(selected);
              }}
            >
              <h3>
                <TranslatedText
                  text={busy ? t('Reading your statement…') : t('Drop your statement here')}
                />
              </h3>
              <p>
                <TranslatedText
                  text={
                    busy
                      ? t('Your file is being read privately on this device.')
                      : t('or choose a file from your phone or computer')
                  }
                />
              </p>
              {busy ? (
                <>
                  <progress
                    max="100"
                    value={progress}
                    aria-label={t('Statement parsing progress')}
                  />
                  <p role="status">
                    <TranslatedText
                      text={t('{progress}% read', { progress: Math.round(progress) })}
                    />
                  </p>
                  <button className="button outline" onClick={cancelParsing}>
                    <TranslatedText text={t('Cancel reading')} />
                  </button>
                </>
              ) : (
                <button
                  className="button primary"
                  disabled={!workerReady || restarting}
                  onClick={() => fileRef.current?.click()}
                >
                  <TranslatedText text={t('Choose file')} />
                </button>
              )}
              <span className="file-types">
                <TranslatedText text={t('PDF or CSV ')} />
                <span>
                  <TranslatedText text={t('·')} />
                </span>{' '}
                <TranslatedText text={t('Up to 25 MB')} />
              </span>
            </div>
            <p className="reader-status" role="status">
              {workerReady && !restarting ? (
                <>
                  <TranslatedText text={t('Ready to import')} />
                </>
              ) : (
                <>
                  <TranslatedText text={t('Getting your private file reader ready…')} />
                </>
              )}
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
                <label htmlFor="pdf-password">
                  <TranslatedText text={t('PDF password')} />
                </label>
                <input
                  autoFocus
                  id="pdf-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                  required
                />
                <p>
                  <TranslatedText
                    text={t('Your password only unlocks this file on your device.')}
                  />
                </p>
                <button className="button primary" disabled={busy}>
                  <TranslatedText text={t('Unlock PDF')} />
                </button>
              </form>
            )}
            {mappingResult && (
              <form
                className="mapping-wizard"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!mapping.amount && !mapping.debit && !mapping.credit) {
                    setError(t('Choose an amount column, or debit and credit columns.'));
                    return;
                  }
                  if (file) void processFile(file, { mapping });
                }}
              >
                <div className="mapping-title">
                  <h3>
                    <TranslatedText text={t('Match your columns')} />
                  </h3>
                </div>
                <p>
                  <TranslatedText
                    text={t(
                      'This layout is new to us. Tell us which columns to use. Positive amounts are money in; negative amounts are money out.',
                    )}
                  />
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
                      <TranslatedText text={t(mappingColumnKeys[key])} />
                      <select
                        aria-label={t(mappingColumnKeys[key])}
                        value={mapping[key] || ''}
                        required={key === 'date' || key === 'description'}
                        onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                      >
                        <option value="">
                          <TranslatedText
                            text={
                              key === 'date' || key === 'description'
                                ? t('Choose a column')
                                : t('Not used')
                            }
                          />
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
                  aria-label={t('Scrollable table')}
                >
                  <table className="data-table">
                    <caption>
                      <TranslatedText text={t('First rows from your file')} />
                    </caption>
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
                  <TranslatedText text={t('Finish import')} />
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
                <strong>
                  <TranslatedText text={t('Remember on this device')} />
                </strong>
                <small>
                  <TranslatedText
                    text={t('Optional. Otherwise your data disappears when you close this page.')}
                  />
                </small>
              </span>
            </label>
          </section>
          <section className="sample-panel">
            <span className="sample-panel-icon"></span>
            <div>
              <h3>
                <TranslatedText text={t('Explore a sample statement')} />
              </h3>
              <p>
                <TranslatedText
                  text={t(
                    'The sample contains synthetic transactions. Your saved data stays separate.',
                  )}
                />
              </p>
            </div>
            <button className="button outline compact" onClick={loadSample} disabled={sampleBusy}>
              <TranslatedText text={sampleBusy ? t('Loading…') : t('Load sample data')} />
            </button>
          </section>
          {sampleError && (
            <p className="error-message" role="alert">
              {sampleError}
            </p>
          )}
        </div>
        <aside className="import-help">
          <h2>
            <TranslatedText text={t('Where do I find my statement?')} />
          </h2>
          <ProviderGuide />
          <div className="help-note">
            <h3>
              <TranslatedText text={t('You’re in control.')} />
            </h3>
            <p>
              <TranslatedText
                text={t(
                  'We read your statement inside your browser. Your file, password and transactions never leave this device.',
                )}
              />
            </p>
            <span>
              <TranslatedText text={t('No connection to your MoMo account.')} />
            </span>
          </div>
          <p className="support-note">
            <TranslatedText
              text={t(
                'Scanned PDF? Ask your provider for a text PDF or CSV. Photos cannot be read yet.',
              )}
            />
          </p>
        </aside>
      </div>
    </>
  );
}
