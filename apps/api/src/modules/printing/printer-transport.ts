export const PRINTER_TRANSPORTS = ['auto', 'serial', 'path'] as const;
export type PrinterTransport = (typeof PRINTER_TRANSPORTS)[number];
export type ResolvedTransport = Exclude<PrinterTransport, 'auto'>;

const SERIAL_PATH = /^(?:\\\\\.\\)?COM\d+$|^\/dev\/(?:rfcomm|ttyUSB|ttyACM|ttyS|cu\.)/i;

/** Windows COM ports and Linux/macOS serial devices need a configured port; the rest is a plain write. */
export function resolveTransport(path: string, transport: PrinterTransport): ResolvedTransport {
  if (transport !== 'auto') return transport;
  return SERIAL_PATH.test(path) ? 'serial' : 'path';
}
