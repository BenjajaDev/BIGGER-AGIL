import type { SerialPort } from 'serialport';
import { PrinterError, type ReceiptPrinter } from './receipt-printer.js';

/** One open/write/close cycle over a serial port. Reopened for every job so a dropped link recovers. */
export interface SerialLink {
  open: () => Promise<void>;
  /** Resolves once the operating system has handed every byte to the device. */
  write: (data: Uint8Array) => Promise<void>;
  close: () => Promise<void>;
}

export type SerialLinkFactory = (path: string, baudRate: number) => SerialLink;

/** Bluetooth can take several seconds to connect the first time the port is opened. */
const DEFAULT_TIMEOUT_MS = 15_000;
/** Lets the last bytes leave the radio before the port is closed. */
const DEFAULT_SETTLE_MS = 500;

/** `serialport` is loaded on first use: a machine without its native binary can still run the API. */
export const openSerialLink: SerialLinkFactory = (path, baudRate) => {
  let port: SerialPort | undefined;
  return {
    open: async () => {
      const { SerialPort } = await import('serialport');
      const created = new SerialPort({ path, baudRate, autoOpen: false });
      await new Promise<void>((resolve, reject) => {
        created.open((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      port = created;
    },
    write: (data) => {
      const open = port;
      if (!open) return Promise.reject(new Error('Serial port is not open'));
      return new Promise<void>((resolve, reject) => {
        open.write(Buffer.from(data), (writeError) => {
          if (writeError) {
            reject(writeError);
            return;
          }
          open.drain((drainError) => {
            if (drainError) reject(drainError);
            else resolve();
          });
        });
      });
    },
    close: () => {
      const open = port;
      port = undefined;
      if (!open?.isOpen) return Promise.resolve();
      return new Promise<void>((resolve) => {
        open.close(() => {
          resolve();
        });
      });
    },
  };
};

function explain(error: unknown, path: string): string {
  const text = error instanceof Error ? error.message : '';
  if (/file not found|no such file|cannot find|ENOENT/i.test(text)) {
    return `No se encontró la impresora en «${path}». Revisa que esté encendida y que el puerto sea el «Saliente» de Bluetooth.`;
  }
  if (/access denied|permission|EACCES|EPERM|busy|EBUSY/i.test(text)) {
    return `El puerto «${path}» está en uso o sin permiso. Cierra otros programas que usen la impresora.`;
  }
  return 'No se pudo enviar el trabajo a la impresora.';
}

export interface SerialPrinterOptions {
  baudRate: number;
  timeoutMs?: number;
  settleMs?: number;
  link?: SerialLinkFactory;
}

export class SerialPrinter implements ReceiptPrinter {
  readonly description: string;
  readonly #path: string;
  readonly #baudRate: number;
  readonly #timeoutMs: number;
  readonly #settleMs: number;
  readonly #link: SerialLinkFactory;

  constructor(
    path: string,
    {
      baudRate,
      timeoutMs = DEFAULT_TIMEOUT_MS,
      settleMs = DEFAULT_SETTLE_MS,
      link = openSerialLink,
    }: SerialPrinterOptions,
  ) {
    this.#path = path;
    this.#baudRate = baudRate;
    this.#timeoutMs = timeoutMs;
    this.#settleMs = settleMs;
    this.#link = link;
    this.description = path;
  }

  async print(data: Uint8Array): Promise<void> {
    const link = this.#link(this.#path, this.#baudRate);
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(
          new PrinterError('La impresora no responde. Revisa que esté encendida y con papel.'),
        );
      }, this.#timeoutMs);
    });
    try {
      await Promise.race([this.#send(link, data), timeout]);
    } catch (error) {
      if (error instanceof PrinterError) throw error;
      throw new PrinterError(explain(error, this.#path), { cause: error });
    } finally {
      clearTimeout(timer);
      await link.close().catch(() => undefined);
    }
  }

  async #send(link: SerialLink, data: Uint8Array): Promise<void> {
    await link.open();
    await link.write(data);
    await new Promise<void>((resolve) => setTimeout(resolve, this.#settleMs));
  }
}
