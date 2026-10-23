'use client';
import type { View } from '@/lib/ui-types';
import { PageHeading, ProviderGuide } from '@/components/ui/shared';

export function About({ navigate }: { navigate: (v: View) => void }) {
  return (
    <>
      <PageHeading title="About MoMo Lens" description="Built for the way Ghana moves money." />
      <div className="about-layout">
        <section className="panel prose-panel">
          <h2>Understand your statement</h2>
          <p>
            MoMo Lens turns your MTN MoMo or Telecel Cash statement into a clear picture of your
            money. See who you send to, what you spend on, and how much goes to fees, airtime and
            data.
          </p>
          <p>
            It runs entirely on your device. It is free and open source, with no accounts, adverts
            or analytics.
          </p>
          <h3>How it works</h3>
          <ul>
            <li>Save an electronic PDF or CSV statement from your provider.</li>
            <li>Import it here. Review the transactions and fix categories if needed.</li>
            <li>Explore your overview, or make a private MoMo Wrapped card.</li>
          </ul>
          <button className="button primary" onClick={() => navigate('import')}>
            Import statement
          </button>
          <h3>Still growing, with your help.</h3>
          <p>
            Provider layouts change. The included examples are synthetic. The MTN layout uses
            documented assumptions, and real statements may need the column mapper. Always compare
            the results with your original statement.
          </p>
          <p>
            Contributors can add parsers, review the Twi translations and improve accessibility.
            Redact personal details before sharing an example with a contributor.
          </p>
          <p className="about-disclaimer">
            MoMo Lens is an independent project, not affiliated with MTN or Telecel. It provides a
            view of your statement, not financial advice.
          </p>
        </section>
        <aside className="import-help">
          <h2>Get your statement</h2>
          <ProviderGuide />
          <div className="help-note">
            <h3>Open to everyone.</h3>
            <p>
              MIT licensed. Built for everyday Ghanaian mobile money users, and for contributors who
              want to make it better.
            </p>
            <span>English today. Twi translations are prepared for native-speaker review.</span>
          </div>
        </aside>
      </div>
    </>
  );
}
