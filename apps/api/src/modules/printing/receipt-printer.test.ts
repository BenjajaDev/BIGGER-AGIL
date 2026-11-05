import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PathPrinter, PrinterError } from './receipt-printer.js';

const tempPath = () => join(mkdtempSync(join(tmpdir(), 'bigger-printer-')), 'ticket.bin');

describe('PathPrinter', () => {
  it('appends the bytes to the device path, one job after another', async () => {
    const path = tempPath();
    const printer = new PathPrinter(path);
    await printer.print(Buffer.from([1, 2, 3]));
    await printer.print(Buffer.from([4, 5]));
    expect([...readFileSync(path)]).toEqual([1, 2, 3, 4, 5]);
  });

  it('explains a missing device in plain Spanish without leaking the system error', async () => {
    const path = join(tmpdir(), 'bigger-no-existe-ni-en-sueños', 'lp0');
    const error = await new PathPrinter(path)
      .print(Buffer.from([1]))
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(PrinterError);
    expect((error as PrinterError).message).toBe(
      `No se encontró la impresora en «${path}». Revisa que esté encendida y conectada.`,
    );
  });

  it('gives up when the device never answers', async () => {
    const printer = new PathPrinter('COM5', {
      timeoutMs: 20,
      write: () => new Promise<void>(() => undefined),
    });
    await expect(printer.print(Buffer.from([1]))).rejects.toThrow(
      'La impresora no responde. Revisa que esté encendida y con papel.',
    );
  });

  it('turns permission errors into a message the cashier can act on', async () => {
    const denied = Object.assign(new Error('EACCES'), { code: 'EACCES' });
    const printer = new PathPrinter('/dev/usb/lp0', { write: () => Promise.reject(denied) });
    await expect(printer.print(Buffer.from([1]))).rejects.toThrow(
      'Sin permiso para escribir en «/dev/usb/lp0»',
    );
  });
});
