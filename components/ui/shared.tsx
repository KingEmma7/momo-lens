'use client';
import type { ReactNode } from 'react';
import { formatMoney } from '@/lib/money';
import type { View } from '@/lib/ui-types';
export function currency(n: number) {
  return formatMoney(n);
}
export function shortDate(value: string) {
  return new Date(value).toLocaleDateString('en-GH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
export function monthLabel(value: string) {
  return new Date(`${value}-01T00:00:00Z`).toLocaleDateString('en-GH', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
export function Logo({ _small = false, small = false }: { _small?: boolean; small?: boolean }) {
  return <span className={`brand ${small ? 'small' : ''}`}>MoMo Lens</span>;
}
export function Empty({
  title = 'No statement imported',
  description = 'Import a PDF or CSV to review your transactions.',
  navigate,
}: {
  title?: string;
  description?: string;
  navigate: (v: View) => void;
}) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
      <button className="button primary" onClick={() => navigate('import')}>
        Import statement
      </button>
    </section>
  );
}
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function ProviderGuide() {
  return (
    <div className="provider-guides">
      <details>
        <summary>MTN MoMo</summary>
        <p>
          In MyMTN, open MoMo, then My Wallet and look for a detailed statement. Choose a period and
          save the PDF. Menus may change.
        </p>
        <a
          href="https://help-center.mtn.com.gh/hc/en-us/articles/4405321306642-How-do-I-request-for-a-mobile-money-statement"
          target="_blank"
          rel="noreferrer"
        >
          Official MTN statement instructions
        </a>
      </details>
      <details>
        <summary>Telecel Cash</summary>
        <p>
          Request an electronic transaction statement from Telecel Cash support. Ask for a PDF with
          selectable text, or CSV if available.
        </p>
        <a
          href="https://telecel.com.gh/support/terms/international-money-transfer-ts-cs/"
          target="_blank"
          rel="noreferrer"
        >
          Telecel statement request information
        </a>
      </details>
    </div>
  );
}
