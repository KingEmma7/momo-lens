import en, { type TranslationKey } from './en';
import tw from './tw';

export type Locale = 'en' | 'tw';
export function t(key: TranslationKey, locale: Locale = 'en'): string {
  return locale === 'tw' ? (tw[key] ?? en[key]) : en[key];
}
export { en, tw };
export type { TranslationKey };
