import type { Category } from '../parsers/types';
export const CATEGORIES: readonly Category[] = [
  { id: 'airtime', label: 'Airtime', icon: 'phone', colour: '#d88e42' },
  { id: 'data', label: 'Data bundles', icon: 'wifi', colour: '#a7b87c' },
  { id: 'transfers-sent', label: 'Transfers sent', icon: 'arrow-up-right', colour: '#c96845' },
  {
    id: 'transfers-received',
    label: 'Transfers received',
    icon: 'arrow-down-left',
    colour: '#227865',
  },
  { id: 'cash-out', label: 'Cash out', icon: 'wallet', colour: '#aa9277' },
  { id: 'merchant-payments', label: 'Merchant payments', icon: 'shopping-bag', colour: '#d3b45a' },
  { id: 'bills', label: 'Bills & utilities', icon: 'receipt', colour: '#8c91ad' },
  { id: 'fees', label: 'Fees & levies', icon: 'coins', colour: '#a56c76' },
  { id: 'reversals', label: 'Reversals', icon: 'rotate-ccw', colour: '#63a5a1' },
  { id: 'other', label: 'Other', icon: 'circle', colour: '#9c9d8f' },
];
export const CATEGORY_IDS = new Set(CATEGORIES.map((category) => category.id));
