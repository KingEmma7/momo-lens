import { prepareParserAssets } from './parser-assets';
import { t } from './i18n/index';
import { proxy, wrap, type Remote } from 'comlink';
import type { ColumnMapping, ParseResult } from './parsers/types';
import type { ParserWorker, WorkerParseResponse } from '../workers/parse.worker';

export type ParseErrorCode =
  | 'PASSWORD_REQUIRED'
  | 'PASSWORD_INCORRECT'
  | 'IMAGE_ONLY'
  | 'UNSUPPORTED_FILE'
  | 'FILE_TOO_LARGE'
  | 'EMPTY_FILE'
  | 'PARSE_FAILED'
  | 'CANCELLED';

export class ParseFileError extends Error {
  constructor(
    public readonly code: ParseErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ParseFileError';
  }
}

export interface ParseFileOptions {
  password?: string;
  mapping?: ColumnMapping;
  onProgress?: (progress: number) => void;
}

let parser: Remote<ParserWorker> | undefined;
let worker: Worker | undefined;
let ready: Promise<void> | undefined;
let assetUrls: { entry: string; pdf: string } | undefined;
let workerEpoch = 0;
const pendingCancellations = new Set<() => void>();

function getParser(): Remote<ParserWorker> {
  if (!parser) {
    worker = assetUrls
      ? new Worker(assetUrls.entry, { name: 'momo-lens-private-parser' })
      : new Worker(new URL('../workers/parse.worker.ts', import.meta.url), {
          type: 'module',
          name: 'momo-lens-private-parser',
        });
    parser = wrap<ParserWorker>(worker);
  }
  return parser;
}

function withWorkerDeadline<T>(
  operation: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  const activeWorker = worker;
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(fail, timeoutMs);
    function cleanup(): void {
      clearTimeout(timeout);
      pendingCancellations.delete(cancel);
      activeWorker?.removeEventListener('error', fail);
      activeWorker?.removeEventListener('messageerror', fail);
    }
    function cancel(): void {
      if (settled) return;
      settled = true;
      cleanup();
      reject(
        new ParseFileError('CANCELLED', t('Reading cancelled. Choose a statement to try again.')),
      );
    }
    pendingCancellations.add(cancel);
    function fail(event?: Event): void {
      if (settled) return;
      settled = true;
      event?.preventDefault();
      cleanup();
      if (worker === activeWorker) closeParser();
      reject(new ParseFileError('PARSE_FAILED', message));
    }
    activeWorker?.addEventListener('error', fail);
    activeWorker?.addEventListener('messageerror', fail);
    operation.then(
      (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      },
      () => fail(),
    );
  });
}

/** Load all parser assets before enabling statement selection. Never passes file data. */
export async function warmParser(): Promise<void> {
  if (!ready) {
    const epoch = workerEpoch;
    ready = (async () => {
      if (process.env.NODE_ENV === 'production') assetUrls = await prepareParserAssets();
      if (epoch !== workerEpoch)
        throw new ParseFileError(
          'CANCELLED',
          t('Reading cancelled. Choose a statement to try again.'),
        );
      await withWorkerDeadline(
        getParser().warm(assetUrls?.pdf),
        25_000,
        t('The local parser could not start. Reload this page and try again.'),
      );
    })().catch((error: unknown) => {
      if (epoch === workerEpoch) closeParser();
      if (error instanceof ParseFileError) throw error;
      throw new ParseFileError(
        'PARSE_FAILED',
        t('The local parser could not start. Reload this page and try again.'),
      );
    });
  }
  await ready;
}

export async function parseFile(file: File, options: ParseFileOptions = {}): Promise<ParseResult> {
  const epoch = workerEpoch;
  if (file.size > 25 * 1024 * 1024) {
    throw new ParseFileError(
      'FILE_TOO_LARGE',
      t('This file is larger than 25 MB. Choose a shorter statement period.'),
    );
  }
  if (!/\.(csv|pdf)$/i.test(file.name)) {
    throw new ParseFileError(
      'UNSUPPORTED_FILE',
      t('Choose a PDF or CSV statement. Spreadsheet exports are not supported yet.'),
    );
  }
  if (file.size === 0)
    throw new ParseFileError('EMPTY_FILE', t('This file is empty. Choose another statement.'));
  await warmParser();
  if (epoch !== workerEpoch)
    throw new ParseFileError('CANCELLED', t('Reading cancelled. Choose a statement to try again.'));
  const activeWorker = worker;
  const bytes = await file.arrayBuffer();
  if (epoch !== workerEpoch || worker !== activeWorker)
    throw new ParseFileError('CANCELLED', t('Reading cancelled. Choose a statement to try again.'));
  const progress = options.onProgress ?? (() => undefined);
  const response: WorkerParseResponse = await withWorkerDeadline<WorkerParseResponse>(
    getParser().parse(
      {
        name: file.name,
        bytes,
        ...(options.password ? { password: options.password } : {}),
        ...(options.mapping ? { mapping: options.mapping } : {}),
      },
      proxy(progress),
    ),
    120_000,
    t('Reading this file took too long. Try a shorter statement period or a CSV export.'),
  );
  if (!response.ok) throw new ParseFileError(response.code, response.message);
  return response.result;
}

export function closeParser(): void {
  ++workerEpoch;
  for (const cancel of pendingCancellations) cancel();
  worker?.terminate();
  worker = undefined;
  parser = undefined;
  ready = undefined;
}
