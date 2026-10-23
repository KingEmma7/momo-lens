import { makeSession, parseTable, readTable } from './common';
import type { ParseInput, ParseResult, StatementParser } from './types';

export function parseGenericCsv(input: ParseInput): ParseResult {
  if (!input.mapping) {
    const table = readTable(input);
    return {
      transactions: [],
      session: makeSession(input.name, 'generic'),
      columns: table.columns,
      preview: table.rows.slice(0, 5),
      needsMapping: true,
    };
  }
  return parseTable(input, 'generic');
}
export const genericCsvParser: StatementParser = {
  id: 'generic',
  detect: () => 0,
  parse: parseGenericCsv,
};
export default genericCsvParser;
