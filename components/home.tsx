'use client';
import { useI18n, TranslatedText } from '@/lib/i18n/react';
import type { View } from '@/lib/ui-types';
export function Home({
  navigate,
  loadSample,
  busy,
  error,
}: {
  navigate: (v: View) => void;
  loadSample: () => void;
  busy: boolean;
  error: string;
}) {
  const { t } = useI18n();
  return (
    <>
      <section className="home-intro">
        <h1>
          <TranslatedText text={t('A clear record of your mobile money.')} />
        </h1>
        <p>
          <TranslatedText
            text={t(
              'Read your MTN MoMo or Telecel Cash statement, check your transactions and see what you spent. No uploads, no accounts, no tracking.',
            )}
          />
        </p>
        <div className="home-actions">
          <button className="button primary" onClick={() => navigate('import')}>
            <TranslatedText text={t('Import my statement')} />
          </button>
          <button className="button outline" onClick={loadSample} disabled={busy}>
            <TranslatedText text={busy ? t('Reading sample…') : t('Try sample data')} />
          </button>
        </div>
        <p className="muted">
          <TranslatedText
            text={t('PDF and CSV. No account required. Sample transactions are synthetic.')}
          />
        </p>
        {busy && (
          <p role="status">
            <TranslatedText text={t('Reading the synthetic statement on your device…')} />
          </p>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
      </section>
      <section className="home-ledger" aria-labelledby="ledger-preview-title">
        <h2 id="ledger-preview-title">
          <TranslatedText text={t('Your statement')} />
        </h2>
        <dl className="ledger-figures">
          <div>
            <dt>
              <TranslatedText text={t('Money in')} />
            </dt>
            <dd>
              <TranslatedText text={t('Not imported')} />
            </dd>
          </div>
          <div>
            <dt>
              <TranslatedText text={t('Money out')} />
            </dt>
            <dd>
              <TranslatedText text={t('Not imported')} />
            </dd>
          </div>
          <div>
            <dt>
              <TranslatedText text={t('Net change')} />
            </dt>
            <dd>
              <TranslatedText text={t('Not imported')} />
            </dd>
          </div>
        </dl>
        <div className="table-scroll" tabIndex={0} role="region" aria-label={t('Scrollable table')}>
          <table className="data-table">
            <caption>
              <TranslatedText text={t('No statement selected')} />
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <TranslatedText text={t('Date')} />
                </th>
                <th scope="col">
                  <TranslatedText text={t('Counterparty')} />
                </th>
                <th scope="col">
                  <TranslatedText text={t('Category')} />
                </th>
                <th scope="col" className="numeric">
                  <TranslatedText text={t('Amount')} />
                </th>
              </tr>
            </thead>
            <tbody />
          </table>
        </div>
        <p className="table-empty-note">
          <TranslatedText
            text={t(
              'Your transactions will appear here after import. Your file is read locally and is never uploaded.',
            )}
          />
        </p>
      </section>
      <section className="home-notes">
        <div>
          <h2>
            <TranslatedText text={t('Get your statement')} />
          </h2>
          <p>
            <TranslatedText
              text={t(
                'Save an electronic PDF or CSV from your provider. Scanned images cannot be read yet.',
              )}
            />
          </p>
          <button className="text-link" onClick={() => navigate('about')}>
            <TranslatedText text={t('Statement instructions')} />
          </button>
        </div>
        <div>
          <h2>
            <TranslatedText text={t('Keep control of your data')} />
          </h2>
          <p>
            <TranslatedText
              text={t(
                'Session-only by default. Saving on this browser is optional, and you can delete saved data at any time.',
              )}
            />
          </p>
          <button className="text-link" onClick={() => navigate('privacy')}>
            <TranslatedText text={t('Privacy and storage')} />
          </button>
        </div>
      </section>
    </>
  );
}
