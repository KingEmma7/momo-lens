import { t } from '../i18n/index';
import { genericCsvParser } from './generic-csv';
import { mtnParser } from './mtn-gh';
import { telecelParser } from './telecel-gh';
import type { ParseInput, ParseResult, StatementParser } from './types';

export const PARSERS: readonly StatementParser[] = [mtnParser, telecelParser];
export async function detectAndParse(
  input: ParseInput,
  onProgress?: (progress: number, message?: string) => void,
): Promise<ParseResult> {
  onProgress?.(10, t('Reading the statement columns'));
  if (input.mapping) {
    const result = await genericCsvParser.parse(input);
    onProgress?.(100, t('Statement ready'));
    return result;
  }
  const candidates = PARSERS.map((parser) => ({
    parser,
    confidence: parser.detect({ name: input.name }, input.text),
  })).sort((a, b) => b.confidence - a.confidence);
  const selected = candidates[0];
  onProgress?.(35, t('Checking dates and money amounts'));
  if (selected && selected.confidence >= 0.8) {
    const result = await selected.parser.parse(input);
    if (input.kind === 'csv' && !result.transactions.length) {
      const mapped = await genericCsvParser.parse(input);
      mapped.session.warnings.push(
        t('No transactions matched the detected layout. Check the column mapping.'),
      );
      onProgress?.(100, t('Choose the statement columns'));
      return mapped;
    }
    onProgress?.(100, t('Statement ready'));
    return result;
  }
  const result = await genericCsvParser.parse(input);
  onProgress?.(100, t('Choose the statement columns'));
  return result;
}
export type { ParseInput, ParseResult, ColumnMapping, StatementParser } from './types';
