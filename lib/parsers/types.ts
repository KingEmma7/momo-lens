export type Pesewas = number & { readonly __brand: 'Pesewas' };
export type Provider = 'mtn-gh' | 'telecel-gh' | 'generic';
export type TransactionType =
  | 'transfer'
  | 'cash-out'
  | 'airtime'
  | 'data'
  | 'merchant-payment'
  | 'bill'
  | 'fee'
  | 'interest'
  | 'reversal'
  | 'other';
export interface Transaction {
  id: string;
  provider: Provider;
  date: string;
  type: TransactionType;
  direction: 'in' | 'out';
  amount: Pesewas;
  fee: Pesewas;
  levy: Pesewas;
  balanceAfter?: Pesewas;
  counterpartyName?: string;
  counterpartyMasked?: string;
  reference?: string;
  rawDescription: string;
  categoryId: string;
  categorySource: 'rule' | 'user' | 'default';
}
export interface Category {
  id: string;
  label: string;
  icon: string;
  colour: string;
}
export interface Rule {
  id: string;
  match: { counterparty?: string; descriptionContains?: string; type?: TransactionType };
  categoryId: string;
  createdAt: string;
}
export interface ImportSession {
  id: string;
  fileName: string;
  provider: Provider;
  periodStart: string;
  periodEnd: string;
  parsedCount: number;
  skippedRows: { row: number; reason: string }[];
  warnings: string[];
}
export interface Settings {
  rememberOnDevice: boolean;
  hideAmountsInShare: boolean;
  hideNamesInShare?: boolean;
  locale: 'en' | 'tw';
}
export interface ColumnMapping {
  date: string;
  description: string;
  amount?: string;
  debit?: string;
  credit?: string;
  balance?: string;
  counterparty?: string;
}
export interface ParseInput {
  name: string;
  text: string;
  kind: 'csv' | 'pdf';
  mapping?: ColumnMapping;
}
export interface ParseResult {
  transactions: Transaction[];
  session: ImportSession;
  columns?: string[];
  preview?: string[][];
  needsMapping?: boolean;
}
export interface StatementParser {
  id: Provider;
  detect(file: { name: string }, text: string): number;
  parse(input: ParseInput): ParseResult | Promise<ParseResult>;
}
