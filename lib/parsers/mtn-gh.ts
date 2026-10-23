import { guessMapping, parseTable, readTable } from './common';
import type { StatementParser } from './types';

// ASSUMPTION: MTN Ghana exports can expose Date & Time, Payment Type, Account Name,
// signed Amount, Fees, Tax, Balance and Transaction ID as table columns.
// Public descriptions verify statements exist, but no provider-owned layout specification was found.
export const mtnParser: StatementParser = {
  id: 'mtn-gh',
  detect(file, text) {
    const brand = /\bmtn\b|\bmomo\b/i.test(`${file.name} ${text.slice(0, 1500)}`);
    const mapping = guessMapping(
      readTable({ name: file.name, text, kind: /\.pdf$/i.test(file.name) ? 'pdf' : 'csv' }).columns,
    );
    return brand && mapping ? 0.92 : 0;
  },
  parse: (input) => parseTable(input, 'mtn-gh'),
};
export default mtnParser;
