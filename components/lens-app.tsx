'use client';
import { I18nProvider, TranslatedText } from '@/lib/i18n/react';
import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';

import type { Transaction, Rule, Settings, ParseResult, ImportSession } from '@/lib/parsers/types';
import { applyRules } from '@/lib/categorise/engine';
import { counterpartyRule } from '@/lib/categorise/rules';
import { mergeImportedTransactions } from '@/lib/identity';
import { readData, saveData, clearData, onDataDeleted, DEFAULT_SETTINGS } from '@/lib/storage';
import { closeParser, parseFile, warmParser } from '@/lib/parse-client';
import { translator, translateSystemMessage, textLanguage, type TranslationKey } from '@/lib/i18n';
import type { View } from '@/lib/ui-types';
import { Logo } from '@/components/ui/shared';
import { AnalysisBoundary } from '@/components/ui/analysis-boundary';
import { Home } from '@/components/home';
import { ImportScreen } from '@/components/import/import-screen';
import { Dashboard } from '@/components/charts/dashboard';
import { Review } from '@/components/review/review-screen';
import { Wrapped } from '@/components/wrapped/wrapped-screen';
import { Privacy } from '@/components/privacy-screen';
import { About } from '@/components/about-screen';

const navItems = [
  { view: 'dashboard', label: 'dashboard' },
  { view: 'review', label: 'review' },
  { view: 'wrapped', label: 'wrapped' },
  { view: 'import', label: 'import' },
  { view: 'privacy', label: 'Privacy & data' },
  { view: 'about', label: 'About MoMo Lens' },
] as const satisfies readonly { view: View; label: TranslationKey }[];

export function LensApp({ initialView }: { initialView: View }) {
  const [view, setView] = useState<View>(initialView);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const t = translator(settings.locale);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [session, setSession] = useState<ImportSession>();
  const [sample, setSample] = useState(false);
  const [workerReady, setWorkerReady] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false);
  const [sampleError, setSampleError] = useState('');
  const [importEpoch, setImportEpoch] = useState(0);
  const dataEpoch = useRef(0);
  const sampleText = useRef('');
  const realTransactions = useRef<Transaction[]>([]);
  const realRules = useRef<Rule[]>([]);
  const navigate = useCallback((next: View) => {
    setView(next);
    window.history.pushState(null, '', next === 'home' ? '/' : `/${next}/`);
    window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => document.getElementById('main')?.focus({ preventScroll: true }));
  }, []);
  useEffect(() => {
    let live = true;
    const unsubscribeDeletion = onDataDeleted(() => {
      ++dataEpoch.current;
      closeParser();
      setWorkerReady(false);
      setImportEpoch((epoch) => epoch + 1);
      realTransactions.current = [];
      realRules.current = [];
      setTransactions([]);
      setRules([]);
      setSession(undefined);
      setSample(false);
      setSettings(DEFAULT_SETTINGS);
      setNotice(t('Data was deleted in another tab. This session has been cleared.'));
    });
    void readData().then((data) => {
      if (!live) return;
      setTransactions(data.transactions);
      realTransactions.current = data.transactions;
      realRules.current = data.rules;
      setRules(data.rules);
      setSettings(data.settings);
      if (data.notice) setNotice(data.notice);
      setReady(true);
    });
    const pop = () => {
      const next = window.location.pathname.split('/')[1] as View;
      setView(next || 'home');
    };
    window.addEventListener('popstate', pop);
    void fetch('/sample-statement.csv')
      .then((r) => r.text())
      .then((text) => {
        sampleText.current = text;
      })
      .catch(() => {});
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production')
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        if (live)
          setNotice(
            t(
              'Offline setup is unavailable in this browser. You can still use MoMo Lens while this page is open.',
            ),
          );
      });
    return () => {
      live = false;
      unsubscribeDeletion();
      window.removeEventListener('popstate', pop);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (!sample) {
      realTransactions.current = transactions;
      realRules.current = rules;
    }
    void saveData({
      transactions: sample ? realTransactions.current : transactions,
      rules: sample ? realRules.current : rules,
      settings,
    }).then((message) => {
      if (message) {
        setNotice(message);
        setSettings((prev) =>
          prev.rememberOnDevice ? { ...prev, rememberOnDevice: false } : prev,
        );
      }
    });
  }, [transactions, rules, settings, ready, sample]);
  useEffect(() => {
    if (view !== 'import') return;
    setWorkerReady(false);
    let active = true;
    void Promise.all([warmParser(), import('@/components/charts/monthly-chart')])
      .then(() => {
        if (active) setWorkerReady(true);
      })
      .catch(() => {
        if (active)
          setNotice(t('The file reader could not start. Refresh this page and try again.'));
      });
    return () => {
      active = false;
    };
  }, [view, importEpoch]);
  const renderEpoch = dataEpoch.current;
  const importResult = (result: ParseResult) => {
    if (renderEpoch !== dataEpoch.current) return;
    const baseRules = sample ? realRules.current : rules;
    const { transactions: merged, duplicates } = mergeImportedTransactions(
      sample ? realTransactions.current : transactions,
      result.transactions,
    );
    setRules(baseRules);
    setTransactions(applyRules(merged, baseRules));
    setSession(result.session);
    setSample(false);
    setNotice(
      duplicates
        ? `${t(result.transactions.length - duplicates === 1 ? '{count} transaction added.' : '{count} transactions added.', { count: result.transactions.length - duplicates })} ${t(duplicates === 1 ? '{count} duplicate safely skipped.' : '{count} duplicates safely skipped.', { count: duplicates })}`
        : t(
            result.transactions.length === 1
              ? '{value1} transaction imported. Your statement stayed on this device.'
              : '{value1} transactions imported. Your statement stayed on this device.',
            {
              value1: result.transactions.length,
            },
          ),
    );
    navigate('review');
  };
  const loadSample = async () => {
    const sampleEpoch = dataEpoch.current;
    setSampleBusy(true);
    setSampleError('');
    try {
      await Promise.all([warmParser(), import('@/components/charts/monthly-chart')]);
      setWorkerReady(true);
      const text = sampleText.current || (await (await fetch('/sample-statement.csv')).text());
      const result = await parseFile(new File([text], 'sample-mtn.csv', { type: 'text/csv' }));
      if (sampleEpoch !== dataEpoch.current) return;
      if (!result.transactions.length) throw new Error(t('The sample could not be read.'));
      setTransactions(applyRules(result.transactions, rules));
      setSession(result.session);
      setSample(true);
      setNotice(
        t(
          'Synthetic sample: {value1} invented transactions. This sample does not replace your saved data.',
          { value1: result.transactions.length },
        ),
      );
      navigate('dashboard');
    } catch {
      setSampleError(t('The sample could not load. Please try again.'));
    } finally {
      setSampleBusy(false);
    }
  };
  const recategorise = (id: string, categoryId: string, all: boolean) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    const counterparty = tx.counterpartyName || tx.counterpartyMasked;
    if (all && counterparty) {
      const rule = counterpartyRule(tx, categoryId);
      const nextRules = [...rules, rule];
      setRules(nextRules);
      setTransactions(
        applyRules(
          transactions.map((t) =>
            (
              tx.counterpartyKey
                ? t.counterpartyKey === tx.counterpartyKey
                : (t.counterpartyName || t.counterpartyMasked || '').trim().toLowerCase() ===
                  counterparty.trim().toLowerCase()
            )
              ? { ...t, categoryId, categorySource: 'default' as const }
              : t,
          ),
          nextRules,
        ),
      );
      setNotice(t('Category updated for all transactions from {counterparty}.', { counterparty }));
    } else {
      setTransactions(
        transactions.map((t) => (t.id === id ? { ...t, categoryId, categorySource: 'user' } : t)),
      );
      setNotice(t('Transaction category updated.'));
    }
  };
  const appLink = (v: View, label: ReactNode, className?: string) => (
    <a
      key={v}
      lang={typeof label === 'string' ? textLanguage(label, settings.locale) : 'en'}
      className={className}
      aria-current={view === v ? 'page' : undefined}
      href={v === 'home' ? '/' : `/${v}/`}
      onClick={(e) => {
        e.preventDefault();
        navigate(v);
      }}
    >
      {label}
    </a>
  );
  return (
    <I18nProvider locale={settings.locale}>
      <div className={view === 'home' ? 'site home-site' : 'site app-site'}>
        <a href="#main" className="skip-link">
          <TranslatedText text={t('Skip to content')} />
        </a>
        <div className="privacy-line">
          <TranslatedText text={t('Your file never leaves your browser.')} />
        </div>
        <header className="site-header">
          {appLink('home', <Logo />, 'brand-link')}
          <nav aria-label={t('Main navigation')}>
            {navItems.map(({ view: v, label }) =>
              appLink(v, t(label), view === v ? 'active' : undefined),
            )}
          </nav>
        </header>
        <main id="main" tabIndex={-1} className="app-main">
          {notice && (
            <div className="notice" role="status">
              <span>{translateSystemMessage(notice, settings.locale)}</span>
              <button aria-label={t('Dismiss notice')} onClick={() => setNotice('')}>
                <TranslatedText text={t('Dismiss')} />
              </button>
            </div>
          )}
          {!ready && view !== 'home' && (
            <p className="loading-state" role="status">
              <TranslatedText text={t('Loading your local workspace…')} />
            </p>
          )}
          {view === 'home' && (
            <Home
              navigate={navigate}
              loadSample={loadSample}
              busy={sampleBusy}
              error={sampleError}
            />
          )}
          {ready && view === 'import' && (
            <ImportScreen
              key={importEpoch}
              workerReady={workerReady}
              onComplete={importResult}
              loadSample={loadSample}
              sampleBusy={sampleBusy}
              sampleError={sampleError}
              settings={settings}
              setSettings={setSettings}
            />
          )}
          {ready && view === 'dashboard' && (
            <AnalysisBoundary
              key={view}
              onReview={() => navigate('review')}
              onImport={() => navigate('import')}
            >
              <Dashboard
                transactions={transactions}
                navigate={navigate}
                sample={sample}
                recategorise={recategorise}
              />
            </AnalysisBoundary>
          )}
          {ready && view === 'review' && (
            <Review
              transactions={transactions}
              recategorise={recategorise}
              session={session}
              navigate={navigate}
            />
          )}
          {ready && view === 'wrapped' && (
            <AnalysisBoundary
              key={view}
              onReview={() => navigate('review')}
              onImport={() => navigate('import')}
            >
              <Wrapped
                transactions={transactions}
                settings={settings}
                setSettings={setSettings}
                navigate={navigate}
                sample={sample}
              />
            </AnalysisBoundary>
          )}
          {ready && view === 'privacy' && (
            <Privacy
              settings={settings}
              setSettings={setSettings}
              rules={rules}
              onDelete={async () => {
                ++dataEpoch.current;
                closeParser();
                setWorkerReady(false);
                setImportEpoch((epoch) => epoch + 1);
                const deletionNotice = await clearData();
                realTransactions.current = [];
                realRules.current = [];
                setTransactions([]);
                setRules([]);
                setSession(undefined);
                setSample(false);
                setSettings(DEFAULT_SETTINGS);
                setNotice(
                  deletionNotice ||
                    t('All your saved transactions, rules and settings have been deleted.'),
                );
              }}
            />
          )}
          {ready && view === 'about' && <About navigate={navigate} />}
          <footer className="app-footer">
            <span>
              <TranslatedText text={t('MoMo Lens · Independent, open source software.')} />
            </span>
            <span>
              <TranslatedText text={t('Not affiliated with MTN or Telecel.')} />
            </span>
          </footer>
        </main>
      </div>
    </I18nProvider>
  );
}
