'use client';
import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';

import type { Transaction, Rule, Settings, ParseResult, ImportSession } from '@/lib/parsers/types';
import { applyRules } from '@/lib/categorise/engine';
import { readData, saveData, clearData, DEFAULT_SETTINGS } from '@/lib/storage';
import { parseFile, warmParser } from '@/lib/parse-client';
import { t } from '@/lib/i18n';
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
  { view: 'dashboard', label: t('dashboard') },
  { view: 'review', label: t('review') },
  { view: 'wrapped', label: t('wrapped') },
  { view: 'import', label: t('import') },
  { view: 'privacy', label: 'Privacy & data' },
  { view: 'about', label: 'About MoMo Lens' },
] as const;

export function LensApp({ initialView }: { initialView: View }) {
  const [view, setView] = useState<View>(initialView);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [session, setSession] = useState<ImportSession>();
  const [sample, setSample] = useState(false);
  const [workerReady, setWorkerReady] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false);
  const [sampleError, setSampleError] = useState('');
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
            'Offline setup is unavailable in this browser. You can still use MoMo Lens while this page is open.',
          );
      });
    return () => {
      live = false;
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
    let active = true;
    void Promise.all([warmParser(), import('@/components/charts/monthly-chart')])
      .then(() => {
        if (active) setWorkerReady(true);
      })
      .catch(() => {
        if (active) setNotice('The file reader could not start. Refresh this page and try again.');
      });
    return () => {
      active = false;
    };
  }, [view]);
  const importResult = (result: ParseResult) => {
    const baseRules = sample ? realRules.current : rules;
    const all = new Map((sample ? realTransactions.current : transactions).map((t) => [t.id, t]));
    let duplicates = 0;
    for (const t of result.transactions) {
      if (all.has(t.id)) {
        duplicates++;
        continue;
      }
      all.set(t.id, t);
    }
    setRules(baseRules);
    setTransactions(applyRules([...all.values()], baseRules));
    setSession(result.session);
    setSample(false);
    setNotice(
      duplicates
        ? `${result.transactions.length - duplicates} transactions added. ${duplicates} duplicates safely skipped.`
        : `${result.transactions.length} transactions imported. Your statement stayed on this device.`,
    );
    navigate('review');
  };
  const loadSample = async () => {
    setSampleBusy(true);
    setSampleError('');
    try {
      await Promise.all([warmParser(), import('@/components/charts/monthly-chart')]);
      setWorkerReady(true);
      const text = sampleText.current || (await (await fetch('/sample-statement.csv')).text());
      const result = await parseFile(new File([text], 'sample-mtn.csv', { type: 'text/csv' }));
      if (!result.transactions.length) throw new Error('The sample could not be read.');
      setTransactions(applyRules(result.transactions, rules));
      setSession(result.session);
      setSample(true);
      setNotice(
        `Synthetic sample: ${result.transactions.length} invented transactions. This sample does not replace your saved data.`,
      );
      navigate('dashboard');
    } catch {
      setSampleError('The sample could not load. Please try again.');
    } finally {
      setSampleBusy(false);
    }
  };
  const recategorise = (id: string, categoryId: string, all: boolean) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    const counterparty = tx.counterpartyName || tx.counterpartyMasked;
    if (all && counterparty) {
      const rule: Rule = {
        id: crypto.randomUUID(),
        match: { counterparty },
        categoryId,
        createdAt: new Date().toISOString(),
      };
      const nextRules = [...rules, rule];
      setRules(nextRules);
      setTransactions(
        applyRules(
          transactions.map((t) =>
            (t.counterpartyName || t.counterpartyMasked || '').trim().toLowerCase() ===
            counterparty.trim().toLowerCase()
              ? { ...t, categoryId, categorySource: 'default' as const }
              : t,
          ),
          nextRules,
        ),
      );
      setNotice(`Category updated for all transactions from ${counterparty}.`);
    } else {
      setTransactions(
        transactions.map((t) => (t.id === id ? { ...t, categoryId, categorySource: 'user' } : t)),
      );
      setNotice('Transaction category updated.');
    }
  };
  const appLink = (v: View, label: ReactNode, className?: string) => (
    <a
      key={v}
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
    <div className={view === 'home' ? 'site home-site' : 'site app-site'}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="privacy-line">Your file never leaves your browser.</div>
      <header className="site-header">
        {appLink('home', <Logo />, 'brand-link')}
        <nav aria-label="Main navigation">
          {navItems.map(({ view: v, label }) =>
            appLink(v, label, view === v ? 'active' : undefined),
          )}
        </nav>
      </header>
      <main id="main" tabIndex={-1} className="app-main">
        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button aria-label="Dismiss notice" onClick={() => setNotice('')}>
              Dismiss
            </button>
          </div>
        )}
        {!ready && view !== 'home' && (
          <p className="loading-state" role="status">
            Loading your local workspace…
          </p>
        )}
        {view === 'home' && (
          <Home navigate={navigate} loadSample={loadSample} busy={sampleBusy} error={sampleError} />
        )}
        {ready && view === 'import' && (
          <ImportScreen
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
                  'All your saved transactions, rules and settings have been deleted.',
              );
            }}
          />
        )}
        {ready && view === 'about' && <About navigate={navigate} />}
        <footer className="app-footer">
          <span>MoMo Lens · Independent, open source software.</span>
          <span>Not affiliated with MTN or Telecel.</span>
        </footer>
      </main>
    </div>
  );
}
