import { describe, expect, it } from 'vitest';
import { PrinterError } from './receipt-printer.js';
import { SerialPrinter, type SerialLink } from './serial-printer.js';

function fakeLink(overrides: Partial<SerialLink> = {}) {
  const calls: string[] = [];
  const written: number[] = [];
  const link: SerialLink = {
    open: () => {
      calls.push('open');
      return Promise.resolve();
    },
    write: (data) => {
      calls.push('write');
      written.push(...data);
      return Promise.resolve();
    },
    close: () => {
      calls.push('close');
      return Promise.resolve();
    },
    ...overrides,
  };
  return { link, calls, written };
}

const printerWith = (link: SerialLink, timeoutMs = 1000) =>
  new SerialPrinter('COM5', { baudRate: 9600, timeoutMs, settleMs: 0, link: () => link });

describe('SerialPrinter', () => {
  it('opens, writes and closes the port for each job', async () => {
    const { link, calls, written } = fakeLink();
    await printerWith(link).print(Buffer.from([1, 2, 3]));
    expect(calls).toEqual(['open', 'write', 'close']);
    expect(written).toEqual([1, 2, 3]);
  });

  it('opens the port at the configured baud rate', async () => {
    const seen: [string, number][] = [];
    const { link } = fakeLink();
    const printer = new SerialPrinter('COM5', {
      baudRate: 19200,
      settleMs: 0,
      link: (path, baudRate) => {
        seen.push([path, baudRate]);
        return link;
      },
    });
    await printer.print(Buffer.from([1]));
    expect(seen).toEqual([['COM5', 19200]]);
  });

  it('closes the port even when the write fails', async () => {
    const { link, calls } = fakeLink({ write: () => Promise.reject(new Error('boom')) });
    await expect(printerWith(link).print(Buffer.from([1]))).rejects.toBeInstanceOf(PrinterError);
    expect(calls).toEqual(['open', 'close']);
  });

  it.each([
    ['Opening COM5: File not found', /No se encontró la impresora en «COM5»/],
    ['Opening COM5: Access denied', /está en uso o sin permiso/],
    ['Opening COM5: Unknown error code 121', /No se pudo enviar el trabajo/],
  ])('explains «%s» without leaking the system error', async (message, expected) => {
    const { link } = fakeLink({ open: () => Promise.reject(new Error(message)) });
    const error = await printerWith(link)
      .print(Buffer.from([1]))
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(PrinterError);
    expect((error as PrinterError).message).toMatch(expected);
    expect((error as PrinterError).message).not.toContain('Unknown error code');
  });

  it('gives up and releases the port when the printer never answers', async () => {
    const { link, calls } = fakeLink({ open: () => new Promise<void>(() => undefined) });
    await expect(printerWith(link, 20).print(Buffer.from([1]))).rejects.toThrow(
      'La impresora no responde. Revisa que esté encendida y con papel.',
    );
    expect(calls).toEqual(['close']);
  });
});
