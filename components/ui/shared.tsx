'use client';
import { useI18n, TranslatedText } from '@/lib/i18n/react';
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
  const { t } = useI18n();
  return (
    <span className={`brand ${small ? 'small' : ''}`}>
      <TranslatedText text={t('MoMo Lens')} />
    </span>
  );
}
export function Empty({
  title,
  description,
  navigate,
}: {
  title?: string;
  description?: string;
  navigate: (v: View) => void;
}) {
  const { t } = useI18n();
  return (
    <section className="empty-state">
      <h2>{title ?? t('No statement imported')}</h2>
      <p>{description ?? t('Import a PDF or CSV to review your transactions.')}</p>
      <button className="button primary" onClick={() => navigate('import')}>
        <TranslatedText text={t('Import statement')} />
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
  const { t } = useI18n();
  return (
    <div className="provider-guides">
      <details>
        <summary>
          <TranslatedText text={t('MTN MoMo')} />
        </summary>
        <p>
          <TranslatedText
            text={t(
              'In MyMTN, open MoMo, then My Wallet and look for a detailed statement. Choose a period and save the PDF. Menus may change.',
            )}
          />
        </p>
        <a
          href="https://help-center.mtn.com.gh/hc/en-us/articles/4405321306642-How-do-I-request-for-a-mobile-money-statement"
          target="_blank"
          rel="noreferrer"
        >
          <TranslatedText text={t('Official MTN statement instructions')} />
        </a>
      </details>
      <details>
        <summary>
          <TranslatedText text={t('Telecel Cash')} />
        </summary>
        <p>
          <TranslatedText
            text={t(
              'Request an electronic transaction statement from Telecel Cash support. Ask for a PDF with selectable text, or CSV if available.',
            )}
          />
        </p>
        <a
          href="https://telecel.com.gh/support/terms/international-money-transfer-ts-cs/"
          target="_blank"
          rel="noreferrer"
        >
          <TranslatedText text={t('Telecel statement request information')} />
        </a>
      </details>
    </div>
  );
}
