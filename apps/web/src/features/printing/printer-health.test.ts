import type { PrinterStatus } from '@bigger/shared';
import { describeHealth, printerHealth } from './printer-health';

const status = (overrides: Partial<PrinterStatus> = {}): PrinterStatus => ({
  enabled: true,
  device: 'COM5',
  codepage: 'cp858',
  columns: 32,
  pending: 0,
  failed: 0,
  lastPrintedAt: null,
  lastError: null,
  ...overrides,
});

describe('printerHealth', () => {
  it.each([
    [status({ enabled: false }), 'off', 'Impresora desactivada'],
    [status(), 'ready', 'Impresora lista'],
    [status({ pending: 2 }), 'busy', 'Imprimiendo…'],
    [
      status({ failed: 1, lastError: 'Sin papel.' }),
      'attention',
      'Impresora: 1 comanda sin imprimir',
    ],
    [status({ failed: 3 }), 'attention', 'Impresora: 3 comandas sin imprimir'],
    [status({ pending: 1, lastError: 'No responde.' }), 'attention', 'Impresora sin respuesta'],
  ])('reads %j as %s', (current, health, text) => {
    expect(printerHealth(current)).toBe(health);
    expect(describeHealth(current)).toBe(text);
  });
});
