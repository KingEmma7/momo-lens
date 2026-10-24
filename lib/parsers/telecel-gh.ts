import { guessMapping, parseTable, readTable } from './common';
import type { StatementParser } from './types';

// ASSUMPTION: Telecel Cash CSV exports, if available, use the same fields as the
// publicly indexed provider-hosted CDR PDF: Receipt NO, Completion time, Details,
// Transaction Status, Paid In, Withdrawn, Balance, Opposite Party.
// ASSUMPTION: Withdrawn is a principal debit; separately labelled fee rows remain separate.
export const telecelParser: StatementParser = {
  id: 'telecel-gh',
  detect(file, text) {
    // ASSUMPTION: provider branding plus recognised structural headers is a detection heuristic, not provider authentication.
    const brand = /telecel|vodafone/i.test(`${file.name} ${text.slice(0, 1500)}`);
    const mapping = guessMapping(
      readTable({ name: file.name, text, kind: /\.pdf$/i.test(file.name) ? 'pdf' : 'csv' }).columns,
    );
    return brand && mapping ? 0.95 : 0;
  },
  parse: (input) => parseTable(input, 'telecel-gh'),
};
export default telecelParser;
