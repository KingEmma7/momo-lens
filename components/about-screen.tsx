'use client';
import { useI18n, TranslatedText } from '@/lib/i18n/react';
import type { View } from '@/lib/ui-types';
import { PageHeading, ProviderGuide } from '@/components/ui/shared';

export function About({ navigate }: { navigate: (v: View) => void }) {
  const { t } = useI18n();
  return (
    <>
      <PageHeading
        title={t('About MoMo Lens')}
        description={t('Built for the way Ghana moves money.')}
      />
      <div className="about-layout">
        <section className="panel prose-panel">
          <h2>
            <TranslatedText text={t('Understand your statement')} />
          </h2>
          <p>
            <TranslatedText
              text={t(
                'MoMo Lens turns your MTN MoMo or Telecel Cash statement into a clear picture of your money. See who you send to, what you spend on, and how much goes to fees, airtime and data.',
              )}
            />
          </p>
          <p>
            <TranslatedText
              text={t(
                'It runs entirely on your device. It is free and open source, with no accounts, adverts or analytics.',
              )}
            />
          </p>
          <h3>
            <TranslatedText text={t('How it works')} />
          </h3>
          <ul>
            <li>
              <TranslatedText
                text={t('Save an electronic PDF or CSV statement from your provider.')}
              />
            </li>
            <li>
              <TranslatedText
                text={t('Import it here. Review the transactions and fix categories if needed.')}
              />
            </li>
            <li>
              <TranslatedText
                text={t('Explore your overview, or make a private MoMo Wrapped card.')}
              />
            </li>
          </ul>
          <button className="button primary" onClick={() => navigate('import')}>
            <TranslatedText text={t('Import statement')} />
          </button>
          <h3>
            <TranslatedText text={t('Still growing, with your help.')} />
          </h3>
          <p>
            <TranslatedText
              text={t(
                'Provider layouts change. The included examples are synthetic. The MTN layout uses documented assumptions, and real statements may need the column mapper. Always compare the results with your original statement.',
              )}
            />
          </p>
          <p>
            <TranslatedText
              text={t(
                'Contributors can add parsers, review the Twi translations and improve accessibility. Redact personal details before sharing an example with a contributor.',
              )}
            />
          </p>
          <p className="about-disclaimer">
            <TranslatedText
              text={t(
                'MoMo Lens is an independent project, not affiliated with MTN or Telecel. It provides a view of your statement, not financial advice.',
              )}
            />
          </p>
        </section>
        <aside className="import-help">
          <h2>
            <TranslatedText text={t('Get your statement')} />
          </h2>
          <ProviderGuide />
          <div className="help-note">
            <h3>
              <TranslatedText text={t('Open to everyone.')} />
            </h3>
            <p>
              <TranslatedText
                text={t(
                  'MIT licensed. Built for everyday Ghanaian mobile money users, and for contributors who want to make it better.',
                )}
              />
            </p>
            <span>
              <TranslatedText
                text={t('English today. Twi translations are prepared for native-speaker review.')}
              />
            </span>
          </div>
        </aside>
      </div>
    </>
  );
}
