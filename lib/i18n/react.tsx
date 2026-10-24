'use client';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { translator, translateSystemMessage, textLanguage, type Locale } from './index';

const LocaleContext = createContext<Locale>('en');
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = 'en';
  }, [locale]);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
export function useI18n() {
  const locale = useContext(LocaleContext);
  return {
    locale,
    t: translator(locale),
    translateSystemMessage: (message: string) => translateSystemMessage(message, locale),
  };
}

export function TranslatedText({ text }: { text: string }) {
  const locale = useContext(LocaleContext);
  return textLanguage(text, locale) === 'tw' ? <span lang="tw">{text}</span> : <>{text}</>;
}
