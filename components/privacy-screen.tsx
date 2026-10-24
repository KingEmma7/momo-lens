'use client';
import { useI18n, TranslatedText } from '@/lib/i18n/react';
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { Rule, Settings } from '@/lib/parsers/types';
import { PageHeading } from '@/components/ui/shared';

export function Privacy({
  settings,
  setSettings,
  rules,
  onDelete,
}: {
  settings: Settings;
  setSettings: (s: Settings) => void;
  rules: Rule[];
  onDelete: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <>
      <PageHeading
        title={t('Privacy and local data')}
        description={t('What the app reads, where it keeps it and how to remove it.')}
      />
      <section className="privacy-hero">
        <h2>
          <TranslatedText text={t('Your statement never leaves your phone.')} />
        </h2>
        <p>
          <TranslatedText text={t('No uploads, no accounts, no tracking.')} />
        </p>
      </section>
      <div className="privacy-grid">
        <section className="panel prose-panel">
          <h2>
            <TranslatedText text={t('Here’s what happens to your file.')} />
          </h2>
          <ul className="privacy-steps">
            <li>
              <strong>
                <TranslatedText text={t('You choose a statement.')} />
              </strong>
              <p>
                <TranslatedText
                  text={t('Your browser reads the file on this device. We never receive it.')}
                />
              </p>
            </li>
            <li>
              <strong>
                <TranslatedText text={t('Your device does the work.')} />
              </strong>
              <p>
                <TranslatedText
                  text={t(
                    'Transactions are sorted using simple rules. No AI. No connection to your mobile money account.',
                  )}
                />
              </p>
            </li>
            <li>
              <strong>
                <TranslatedText text={t('You decide what stays.')} />
              </strong>
              <p>
                <TranslatedText
                  text={t(
                    'By default, your data lives in this open page. Close it and your transactions and category rules disappear.',
                  )}
                />
              </p>
            </li>
          </ul>
          <h3>
            <TranslatedText text={t('A promise you can check.')} />
          </h3>
          <p>
            <TranslatedText
              text={t(
                'After the app’s files load, parsing and analysis use no network requests. You can disconnect from the internet and keep using the app. The source includes a network test so contributors can check this.',
              )}
            />
          </p>
          <p>
            <TranslatedText
              text={t(
                'No analytics, third-party scripts, ads or remote fonts. Your file name, transactions and password never enter a URL or an error report.',
              )}
            />
          </p>
          <p className="inline-link">
            <TranslatedText
              text={t(
                'The MIT-licensed source repository will be linked here when this project is released publicly.',
              )}
            />
          </p>
        </section>
        <section className="panel prose-panel data-settings">
          <span className="settings-icon"></span>
          <h2>
            <TranslatedText text={t('Storage settings')} />
          </h2>
          <label className="form-label">
            <TranslatedText text={t('Language')} />
            <select
              aria-label={t('Language')}
              lang={settings.locale === 'tw' ? 'tw' : 'en'}
              value={settings.locale}
              onChange={(event) =>
                setSettings({ ...settings, locale: event.target.value === 'tw' ? 'tw' : 'en' })
              }
            >
              <option value="en" lang="en">
                <TranslatedText text={t('English')} />
              </option>
              <option value="tw" lang="en">
                <TranslatedText text={t('Twi (draft)')} />
              </option>
            </select>
          </label>
          <p>
            <TranslatedText
              text={t(
                'Twi translations are a draft and need native-speaker review. Missing translations use English.',
              )}
            />
          </p>
          <label className="toggle-row">
            <span>
              <strong>
                <TranslatedText text={t('Remember on this device')} />
              </strong>
              <small>
                <TranslatedText
                  text={t('Save transactions, category rules and preferences in this browser.')}
                />
              </small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={settings.rememberOnDevice}
              aria-label={t('Remember on this device')}
              onChange={(e) => setSettings({ ...settings, rememberOnDevice: e.target.checked })}
            />
          </label>
          <p className="settings-warning">
            <TranslatedText
              text={t(
                'Only turn this on for a device you trust. Anyone with access to this browser could see the saved transactions. Turning it off removes the saved copy.',
              )}
            />
          </p>
          <div className="saved-rules">
            <span>
              <TranslatedText text={t('Saved category rules')} />
            </span>
            <strong>{rules.length}</strong>
          </div>
          <div className="delete-section">
            <h3>
              <TranslatedText text={t('Delete saved data')} />
            </h3>
            <p>
              <TranslatedText
                text={t(
                  'Remove every imported transaction, category rule and preference from this browser.',
                )}
              />
            </p>
            <button className="button danger full" onClick={() => setConfirm(true)}>
              <TranslatedText text={t('Delete all my data')} />
            </button>
          </div>
        </section>
      </div>
      <Dialog.Root open={confirm} onOpenChange={setConfirm}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <Dialog.Title>
              <TranslatedText text={t('Delete all your data?')} />
            </Dialog.Title>
            <Dialog.Description>
              <TranslatedText
                text={t(
                  'This removes all transactions, category rules and settings from this browser. You can import a statement again later.',
                )}
              />
            </Dialog.Description>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <Dialog.Close className="button outline">
                <TranslatedText text={t('Keep my data')} />
              </Dialog.Close>
              <button
                className="button danger"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onDelete();
                    setConfirm(false);
                  } catch {
                    setError(
                      t(
                        'Your browser could not clear saved data. Close other MoMo Lens tabs and try again.',
                      ),
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <TranslatedText text={busy ? t('Deleting…') : t('Yes, delete everything')} />
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
