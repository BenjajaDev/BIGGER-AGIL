import { appendFile } from 'node:fs/promises';

/** Where ticket bytes go. Adapters hide how the printer is reached. */
export interface ReceiptPrinter {
  readonly description: string;
  print: (data: Uint8Array) => Promise<void>;
}

/** A failure the cashier can act on (message in plain Spanish); never a raw system error. */
export class PrinterError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PrinterError';
  }
}

const DEFAULT_TIMEOUT_MS = 8_000;

function explain(error: unknown, path: string): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  switch (code) {
    case 'ENOENT':
    case 'ENODEV':
    case 'ENXIO':
      return `No se encontró la impresora en «${path}». Revisa que esté encendida y conectada.`;
    case 'EACCES':
    case 'EPERM':
      return `Sin permiso para escribir en «${path}». Revisa los permisos del equipo.`;
    case 'EBUSY':
      return 'La impresora está ocupada con otro trabajo.';
    default:
      return 'No se pudo enviar el trabajo a la impresora.';
  }
}

/**
 * Writes to a device path, which covers both ways of connecting:
 * Bluetooth (`COM5`, `/dev/rfcomm0`) and USB (`/dev/usb/lp0`, or a shared Windows printer
 * `\\localhost\NOMBRE`). Appending, because a device is not a file to truncate.
 */
export interface PathPrinterOptions {
  timeoutMs?: number;
  /** How bytes reach the path; replaced in tests to simulate a device that never answers. */
  write?: (path: string, data: Uint8Array) => Promise<void>;
}

export class PathPrinter implements ReceiptPrinter {
  readonly description: string;
  readonly #path: string;
  readonly #timeoutMs: number;
  readonly #write: (path: string, data: Uint8Array) => Promise<void>;

  constructor(
    path: string,
    { timeoutMs = DEFAULT_TIMEOUT_MS, write = appendFile }: PathPrinterOptions = {},
  ) {
    this.#path = path;
    this.#timeoutMs = timeoutMs;
    this.#write = write;
    this.description = path;
  }

  async print(data: Uint8Array): Promise<void> {
    // A powered-off Bluetooth device can block the write indefinitely: give up after the timeout.
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(
          new PrinterError('La impresora no responde. Revisa que esté encendida y con papel.'),
        );
      }, this.#timeoutMs);
    });
    try {
      await Promise.race([this.#write(this.#path, data), timeout]);
    } catch (error) {
      if (error instanceof PrinterError) throw error;
      throw new PrinterError(explain(error, this.#path), { cause: error });
    } finally {
      clearTimeout(timer);
    }
  }
}
