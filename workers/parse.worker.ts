import { t } from '../lib/i18n/index';
import { expose } from 'comlink';
import * as pdfjs from 'pdfjs-dist';
import { detectAndParse } from '../lib/parsers/registry';
import type { ColumnMapping, ParseResult } from '../lib/parsers/types';
import type { ParseErrorCode } from '../lib/parse-client';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
let pdfWorker: pdfjs.PDFWorker | undefined;
let warming: Promise<void> | undefined;

export interface WorkerParseInput {
  name: string;
  bytes: ArrayBuffer;
  password?: string;
  mapping?: ColumnMapping;
}

export type WorkerParseResponse =
  { ok: true; result: ParseResult } | { ok: false; code: ParseErrorCode; message: string };

function failure(code: ParseErrorCode, message: string): WorkerParseResponse {
  return { ok: false, code, message };
}

export function decodeCsv(bytes: ArrayBuffer): { text: string; legacyEncoding: boolean } {
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), legacyEncoding: false };
  } catch {
    return { text: new TextDecoder('windows-1252').decode(bytes), legacyEncoding: true };
  }
}

export async function warm(pdfUrl = '/pdf.worker.min.mjs'): Promise<void> {
  if (pdfWorker) return;
  warming ??= (async () => {
    if (typeof Worker === 'undefined') {
      pdfWorker = new pdfjs.PDFWorker();
      await pdfWorker.promise;
      return;
    }
    const port = new Worker(pdfUrl, { type: 'module', name: 'momo-lens-local-pdf' });
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        port.terminate();
        reject(new Error(t('Local PDF worker did not start.')));
      }, 20_000);
      function cleanup(): void {
        clearTimeout(timeout);
        port.removeEventListener('message', onMessage);
        port.removeEventListener('error', onError);
      }
      function onMessage(event: MessageEvent<unknown>): void {
        if (
          typeof event.data === 'object' &&
          event.data !== null &&
          'action' in event.data &&
          event.data.action === 'ready'
        ) {
          cleanup();
          resolve();
        }
      }
      function onError(): void {
        cleanup();
        port.terminate();
        reject(new Error(t('Local PDF worker did not start.')));
      }
      port.addEventListener('message', onMessage);
      port.addEventListener('error', onError);
    });
    pdfWorker = pdfjs.PDFWorker.create({ port, verbosity: 0 });
    await pdfWorker.promise;
  })().catch((error: unknown) => {
    warming = undefined;
    throw error;
  });
  await warming;
}

/** Coordinates local extraction. Bytes are never sent to a URL or logged. */
export async function parse(
  input: WorkerParseInput,
  onProgress: (progress: number) => void = () => undefined,
): Promise<WorkerParseResponse> {
  if (input.bytes.byteLength > 25 * 1024 * 1024) {
    return failure(
      'FILE_TOO_LARGE',
      t('This file is larger than 25 MB. Choose a shorter statement period.'),
    );
  }
  if (!/\.(csv|pdf)$/i.test(input.name)) {
    return failure('UNSUPPORTED_FILE', t('Choose a PDF or CSV statement.'));
  }
  if (input.bytes.byteLength === 0)
    return failure('EMPTY_FILE', t('This file is empty. Choose another statement.'));
  onProgress(3);
  try {
    let text: string;
    let legacyEncoding = false;
    const kind = /\.pdf$/i.test(input.name) ? 'pdf' : 'csv';
    if (kind === 'pdf') {
      await warm();
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(input.bytes),
        ...(input.password ? { password: input.password } : {}),
        worker: pdfWorker,
        useWasm: false,
        useSystemFonts: true,
        disableFontFace: true,
        useWorkerFetch: false,
        disableAutoFetch: true,
        disableRange: true,
        disableStream: true,
        verbosity: 0,
      });
      let document: pdfjs.PDFDocumentProxy | undefined;
      try {
        document = await loadingTask.promise;
        const lines: string[] = [];
        for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
          const page = await document.getPage(pageNumber);
          const content = await page.getTextContent();
          let line = '';
          let lastY: number | undefined;
          let lastRight: number | undefined;
          for (const item of content.items) {
            if (!('str' in item)) continue;
            const y = item.transform[5] as number | undefined;
            // ASSUMPTION: PDF items follow reading order; a vertical change above 3 points starts another line.
            if (lastY !== undefined && y !== undefined && Math.abs(y - lastY) > 3 && line.trim()) {
              lines.push(line.trim());
              line = '';
              lastRight = undefined;
            }
            const x = item.transform[4] as number | undefined;
            // ASSUMPTION: a gap above 12 PDF points separates table columns.
            const separator = line
              ? x !== undefined && lastRight !== undefined && x - lastRight > 12
                ? '  '
                : ' '
              : '';
            line += `${separator}${item.str}`;
            lastRight = x === undefined ? undefined : x + item.width;
            lastY = y;
            if (item.hasEOL && line.trim()) {
              lines.push(line.trim());
              line = '';
              lastY = undefined;
              lastRight = undefined;
            }
          }
          if (line.trim()) lines.push(line.trim());
          onProgress(Math.round(5 + (pageNumber / document.numPages) * 65));
          page.cleanup();
        }
        text = lines.join('\n');
      } finally {
        await loadingTask.destroy();
      }
      if (text.replace(/\s/g, '').length < 20) {
        return failure(
          'IMAGE_ONLY',
          t(
            'This PDF has no readable text. It may be a scan. Ask your provider for a text PDF or choose a CSV export.',
          ),
        );
      }
    } else {
      const decoded = decodeCsv(input.bytes);
      text = decoded.text;
      legacyEncoding = decoded.legacyEncoding;
      onProgress(35);
    }
    const result = await detectAndParse(
      { name: input.name, text, kind, ...(input.mapping ? { mapping: input.mapping } : {}) },
      (progress) => onProgress(Math.round(75 + progress * 0.24)),
    );
    if (legacyEncoding)
      result.session.warnings.push(
        t(
          'This CSV was read using Windows-1252 text encoding. Check names and descriptions in the review.',
        ),
      );
    onProgress(100);
    return { ok: true, result };
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') {
      return input.password
        ? failure(
            'PASSWORD_INCORRECT',
            t('That password did not open the PDF. Try again. Your password stays on this device.'),
          )
        : failure(
            'PASSWORD_REQUIRED',
            t('This PDF needs a password. Enter it to open the statement on this device.'),
          );
    }
    return failure(
      'PARSE_FAILED',
      t(
        'This statement could not be read. Try a CSV export, or use a redacted statement to report a parser issue.',
      ),
    );
  }
}

export const parserWorker = { warm, parse };
export type ParserWorker = typeof parserWorker;

// This is a dedicated worker entry. Next replaces typeof window in client builds,
// so a window-based guard would remove the endpoint during tree shaking.
expose(parserWorker);
