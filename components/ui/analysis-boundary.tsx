'use client';
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
    return (
      <section className="empty-state" role="alert">
        <h2>These totals need a closer look.</h2>
        <p>
          Some amounts could not be added safely. Review the rows or delete the data from Privacy &
          data, then import a shorter statement period.
        </p>
        <div className="ledger-actions">
          <button className="button primary" onClick={this.props.onReview}>
            Review transactions
          </button>
          <button className="button outline" onClick={this.props.onImport}>
            Import statement
          </button>
        </div>
      </section>
    );
  }
}
