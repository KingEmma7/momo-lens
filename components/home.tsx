'use client';
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
  return (
    <>
      <section className="home-intro">
        <h1>A clear record of your mobile money.</h1>
        <p>
          Read your MTN MoMo or Telecel Cash statement, check your transactions and see what you
          spent. No uploads, no accounts, no tracking.
        </p>
        <div className="home-actions">
          <button className="button primary" onClick={() => navigate('import')}>
            Import my statement
          </button>
          <button className="button outline" onClick={loadSample} disabled={busy}>
            {busy ? 'Reading sample…' : 'Try sample data'}
          </button>
        </div>
        <p className="muted">
          PDF and CSV. No account required. Sample transactions are synthetic.
        </p>
        {busy && <p role="status">Reading the synthetic statement on your device…</p>}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
      </section>
      <section className="home-ledger" aria-labelledby="ledger-preview-title">
        <h2 id="ledger-preview-title">Your statement</h2>
        <dl className="ledger-figures">
          <div>
            <dt>Money in</dt>
            <dd>Not imported</dd>
          </div>
          <div>
            <dt>Money out</dt>
            <dd>Not imported</dd>
          </div>
          <div>
            <dt>Net change</dt>
            <dd>Not imported</dd>
          </div>
        </dl>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="data-table">
            <caption>No statement selected</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Counterparty</th>
                <th scope="col">Category</th>
                <th scope="col" className="numeric">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody />
          </table>
        </div>
        <p className="table-empty-note">
          Your transactions will appear here after import. Your file is read locally and is never
          uploaded.
        </p>
      </section>
      <section className="home-notes">
        <div>
          <h2>Get your statement</h2>
          <p>
            Save an electronic PDF or CSV from your provider. Scanned images cannot be read yet.
          </p>
          <button className="text-link" onClick={() => navigate('about')}>
            Statement instructions
          </button>
        </div>
        <div>
          <h2>Keep control of your data</h2>
          <p>
            Session-only by default. Saving on this browser is optional, and you can delete saved
            data at any time.
          </p>
          <button className="text-link" onClick={() => navigate('privacy')}>
            Privacy and storage
          </button>
        </div>
      </section>
    </>
  );
}
