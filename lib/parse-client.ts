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
  | 'PARSE_FAILED';

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

function getParser(): Remote<ParserWorker> {
  if (!parser) {
    worker = new Worker(new URL('../workers/parse.worker.ts', import.meta.url), {
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
      activeWorker?.removeEventListener('error', fail);
      activeWorker?.removeEventListener('messageerror', fail);
    }
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
    try {
      ready = withWorkerDeadline(
        getParser().warm(),
        25_000,
        'The local parser could not start. Reload this page and try again.',
      );
    } catch {
      closeParser();
      throw new ParseFileError(
        'PARSE_FAILED',
        'The local parser could not start. Reload this page and try again.',
      );
    }
  }
  await ready;
}

export async function parseFile(file: File, options: ParseFileOptions = {}): Promise<ParseResult> {
  if (file.size > 25 * 1024 * 1024) {
    throw new ParseFileError(
      'FILE_TOO_LARGE',
      'This file is larger than 25 MB. Choose a shorter statement period.',
    );
  }
  if (!/\.(csv|pdf)$/i.test(file.name)) {
    throw new ParseFileError(
      'UNSUPPORTED_FILE',
      'Choose a PDF or CSV statement. Spreadsheet exports are not supported yet.',
    );
  }
  if (file.size === 0)
    throw new ParseFileError('EMPTY_FILE', 'This file is empty. Choose another statement.');
  await warmParser();
  const progress = options.onProgress ?? (() => undefined);
  const response: WorkerParseResponse = await withWorkerDeadline<WorkerParseResponse>(
    getParser().parse(
      {
        name: file.name,
        bytes: await file.arrayBuffer(),
        ...(options.password ? { password: options.password } : {}),
        ...(options.mapping ? { mapping: options.mapping } : {}),
      },
      proxy(progress),
    ),
    120_000,
    'Reading this file took too long. Try a shorter statement period or a CSV export.',
  );
  if (!response.ok) throw new ParseFileError(response.code, response.message);
  return response.result;
}

export function closeParser(): void {
  worker?.terminate();
  worker = undefined;
  parser = undefined;
  ready = undefined;
}
