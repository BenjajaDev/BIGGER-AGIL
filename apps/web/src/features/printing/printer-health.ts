import type { PrinterStatus } from '@bigger/shared';

export type PrinterHealth = 'off' | 'ready' | 'busy' | 'attention';

/** One word for the state of the printer, shared by the top bar and the settings page. */
export function printerHealth(status: PrinterStatus): PrinterHealth {
  if (!status.enabled) return 'off';
  if (status.failed > 0 || (status.pending > 0 && status.lastError !== null)) return 'attention';
  return status.pending > 0 ? 'busy' : 'ready';
}

export function describeHealth(status: PrinterStatus): string {
  switch (printerHealth(status)) {
    case 'off':
      return 'Impresora desactivada';
    case 'attention':
      return status.failed > 0
        ? `Impresora: ${status.failed} ${status.failed === 1 ? 'comanda sin imprimir' : 'comandas sin imprimir'}`
        : 'Impresora sin respuesta';
    case 'busy':
      return 'Imprimiendo…';
    case 'ready':
      return 'Impresora lista';
  }
}
