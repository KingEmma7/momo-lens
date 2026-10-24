import { t } from '../i18n';
import type { Category } from '../parsers/types';
export const CATEGORIES: readonly Category[] = (
  [
    { id: 'airtime', labelKey: 'Airtime', icon: 'phone', colour: '#d88e42' },
    { id: 'data', labelKey: 'Data bundles', icon: 'wifi', colour: '#a7b87c' },
    { id: 'transfers-sent', labelKey: 'Transfers sent', icon: 'arrow-up-right', colour: '#c96845' },
    {
      id: 'transfers-received',
      labelKey: 'Transfers received',
      icon: 'arrow-down-left',
      colour: '#227865',
    },
    { id: 'cash-out', labelKey: 'Cash out', icon: 'wallet', colour: '#aa9277' },
    {
      id: 'merchant-payments',
      labelKey: 'Merchant payments',
      icon: 'shopping-bag',
      colour: '#d3b45a',
    },
    { id: 'bills', labelKey: 'Bills & utilities', icon: 'receipt', colour: '#8c91ad' },
    { id: 'fees', labelKey: 'Fees & levies', icon: 'coins', colour: '#a56c76' },
    { id: 'reversals', labelKey: 'Reversals', icon: 'rotate-ccw', colour: '#63a5a1' },
    { id: 'other', labelKey: 'Other', icon: 'circle', colour: '#9c9d8f' },
  ] satisfies readonly Omit<Category, 'label'>[]
).map((category) => ({ ...category, label: t(category.labelKey) }));
export const CATEGORY_IDS = new Set(CATEGORIES.map((category) => category.id));
