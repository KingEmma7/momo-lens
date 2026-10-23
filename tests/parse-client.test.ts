import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ParseResult } from '../lib/parsers/types';

const mocks = vi.hoisted(() => ({ warm: vi.fn(), parse: vi.fn(), terminate: vi.fn() }));
vi.mock('comlink', () => ({
  wrap: () => ({ warm: mocks.warm, parse: mocks.parse }),
  proxy: <T>(callback: T): T => callback,
}));
let workers: EventTarget[] = [];
class LocalWorker extends EventTarget {
  constructor() {
    super();
    workers.push(this);
  }
  terminate(): void {
    mocks.terminate();
  }
}
const emptyResult: ParseResult = {
  transactions: [],
  session: {
    id: 'synthetic',
    fileName: 'synthetic.csv',
    provider: 'generic',
    periodStart: '',
    periodEnd: '',
    parsedCount: 0,
    skippedRows: [],
    warnings: [],
  },
};
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubGlobal('Worker', LocalWorker);
  workers = [];
  mocks.terminate.mockClear();
  mocks.warm.mockReset().mockResolvedValue(undefined);
  mocks.parse.mockReset().mockResolvedValue({ ok: true, result: emptyResult });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('worker client startup and failures', () => {
  it('times out a silent worker and permits a fresh startup', async () => {
    mocks.warm.mockImplementationOnce(() => new Promise(() => undefined));
    const client = await import('../lib/parse-client');
    const assertion = expect(client.warmParser()).rejects.toMatchObject({ code: 'PARSE_FAILED' });
    await vi.advanceTimersByTimeAsync(25_000);
    await assertion;
    expect(mocks.terminate).toHaveBeenCalledTimes(1);
    await client.warmParser();
    expect(workers).toHaveLength(2);
  });

  it('rejects immediately if the worker crashes before answering', async () => {
    mocks.warm.mockImplementationOnce(() => new Promise(() => undefined));
    const client = await import('../lib/parse-client');
    const assertion = expect(client.warmParser()).rejects.toMatchObject({ code: 'PARSE_FAILED' });
    workers[0]?.dispatchEvent(new Event('error'));
    await assertion;
    expect(mocks.terminate).toHaveBeenCalledTimes(1);
  });

  it('reuses a ready worker and returns structured parse results', async () => {
    const client = await import('../lib/parse-client');
    await client.warmParser();
    const result = await client.parseFile(new File(['synthetic'], 'synthetic.csv'));
    expect(result).toEqual(emptyResult);
    expect(mocks.warm).toHaveBeenCalledTimes(1);
    expect(workers).toHaveLength(1);
    client.closeParser();
    expect(mocks.terminate).toHaveBeenCalledTimes(1);
  });

  it('does not let an unresponsive parse leave an endless loading state', async () => {
    mocks.parse.mockImplementationOnce(() => new Promise(() => undefined));
    const client = await import('../lib/parse-client');
    const file = new File(['synthetic'], 'synthetic.csv');
    // File bytes are read before the parse deadline is scheduled.
    const pending = client.parseFile(file);
    const assertion = expect(pending).rejects.toMatchObject({ code: 'PARSE_FAILED' });
    await vi.waitFor(() => expect(mocks.parse).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(120_000);
    await assertion;
    expect(mocks.terminate).toHaveBeenCalledTimes(1);
  });

  it('preserves local password errors without exposing arbitrary worker errors', async () => {
    mocks.parse.mockResolvedValueOnce({
      ok: false,
      code: 'PASSWORD_REQUIRED',
      message: 'This PDF needs a password.',
    });
    const client = await import('../lib/parse-client');
    await expect(client.parseFile(new File(['synthetic'], 'synthetic.pdf'))).rejects.toMatchObject({
      code: 'PASSWORD_REQUIRED',
    });
  });
});
