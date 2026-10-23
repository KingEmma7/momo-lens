'use client';
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
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <>
      <PageHeading
        title="Privacy and local data"
        description="What the app reads, where it keeps it and how to remove it."
      />
      <section className="privacy-hero">
        <h2>Your statement never leaves your phone.</h2>
        <p>No uploads, no accounts, no tracking.</p>
      </section>
      <div className="privacy-grid">
        <section className="panel prose-panel">
          <h2>Here’s what happens to your file.</h2>
          <ul className="privacy-steps">
            <li>
              <strong>You choose a statement.</strong>
              <p>Your browser reads the file on this device. We never receive it.</p>
            </li>
            <li>
              <strong>Your device does the work.</strong>
              <p>
                Transactions are sorted using simple rules. No AI. No connection to your mobile
                money account.
              </p>
            </li>
            <li>
              <strong>You decide what stays.</strong>
              <p>
                By default, your data lives in this open page. Close it and your transactions and
                category rules disappear.
              </p>
            </li>
          </ul>
          <h3>A promise you can check.</h3>
          <p>
            After the app’s files load, parsing and analysis use no network requests. You can
            disconnect from the internet and keep using the app. The source includes a network test
            so contributors can check this.
          </p>
          <p>
            No analytics, third-party scripts, ads or remote fonts. Your file name, transactions and
            password never enter a URL or an error report.
          </p>
          <p className="inline-link">
            The MIT-licensed source repository will be linked here when this project is released
            publicly.
          </p>
        </section>
        <section className="panel prose-panel data-settings">
          <span className="settings-icon"></span>
          <h2>Storage settings</h2>
          <label className="toggle-row">
            <span>
              <strong>Remember on this device</strong>
              <small>Save transactions, category rules and preferences in this browser.</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={settings.rememberOnDevice}
              aria-label="Remember on this device"
              onChange={(e) => setSettings({ ...settings, rememberOnDevice: e.target.checked })}
            />
          </label>
          <p className="settings-warning">
            Only turn this on for a device you trust. Anyone with access to this browser could see
            the saved transactions. Turning it off removes the saved copy.
          </p>
          <div className="saved-rules">
            <span>Saved category rules</span>
            <strong>{rules.length}</strong>
          </div>
          <div className="delete-section">
            <h3>Delete saved data</h3>
            <p>
              Remove every imported transaction, category rule and preference from this browser.
            </p>
            <button className="button danger full" onClick={() => setConfirm(true)}>
              Delete all my data
            </button>
          </div>
        </section>
      </div>
      <Dialog.Root open={confirm} onOpenChange={setConfirm}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <Dialog.Title>Delete all your data?</Dialog.Title>
            <Dialog.Description>
              This removes all transactions, category rules and settings from this browser. You can
              import a statement again later.
            </Dialog.Description>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <Dialog.Close className="button outline">Keep my data</Dialog.Close>
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
                      'Your browser could not clear saved data. Close other MoMo Lens tabs and try again.',
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? 'Deleting…' : 'Yes, delete everything'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
