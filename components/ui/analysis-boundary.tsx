'use client';
import { useI18n, TranslatedText } from '@/lib/i18n/react';
import { Component, type ReactNode } from 'react';
interface Props {
  children: ReactNode;
  onReview: () => void;
  onImport: () => void;
}
/** Keep malformed or unrepresentable totals out of financial summaries. */
export class AnalysisBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <AnalysisFallback onReview={this.props.onReview} onImport={this.props.onImport} />;
  }
}
function AnalysisFallback({ onReview, onImport }: Omit<Props, 'children'>) {
  const { t } = useI18n();
  return (
    <section className="empty-state" role="alert">
      <h2>
        <TranslatedText text={t('These totals need a closer look.')} />
      </h2>
      <p>
        <TranslatedText
          text={t(
            'Some amounts could not be added safely. Review the rows or delete the data from Privacy & data, then import a shorter statement period.',
          )}
        />
      </p>
      <div className="ledger-actions">
        <button className="button primary" onClick={onReview}>
          <TranslatedText text={t('Review transactions')} />
        </button>
        <button className="button outline" onClick={onImport}>
          <TranslatedText text={t('Import statement')} />
        </button>
      </div>
    </section>
  );
}
