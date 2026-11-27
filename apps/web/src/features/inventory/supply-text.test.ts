import type { Supply } from '@bigger/shared';
import {
  expiryPhrase,
  formatQuantity,
  relativeTime,
  shortagePhrase,
  statusPhrase,
  supplyRowLabel,
} from './supply-text';
import { doneMessage, parseQuantity, quantityError, submitLabel } from './movement-math';

const TODAY = '2026-11-27';

const palta: Supply = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Palta',
  unit: 'kg',
  minStock: 3,
  costPerUnitClp: 5000,
  supplierId: null,
  supplierName: null,
  expiresOn: '2026-11-28',
  stock: 4,
};

describe('expiryPhrase', () => {
  it.each([
    ['2026-11-27', 'Vence hoy'],
    ['2026-11-28', 'Vence mañana'],
    ['2026-12-02', 'Vence en 5 días'],
    ['2026-11-26', 'Venció ayer'],
    ['2026-11-14', 'Venció hace 13 días'],
  ])('%s → %s', (date, expected) => {
    expect(expiryPhrase(date, TODAY)).toBe(expected);
  });
});

describe('status words', () => {
  it('says how much is missing and agrees with one unit', () => {
    expect(shortagePhrase({ stock: 0.5, minStock: 3, unit: 'kg' })).toBe(
      'Faltan 2,5 kg para el mínimo',
    );
    expect(shortagePhrase({ stock: 2, minStock: 3, unit: 'un' })).toBe(
      'Falta 1 unidad para el mínimo',
    );
  });

  it('prefers the expiry, then no stock, then the shortage', () => {
    expect(statusPhrase(palta, 'expiring', TODAY)).toBe('Vence mañana');
    expect(statusPhrase({ ...palta, stock: 0, expiresOn: null }, 'out', TODAY)).toBe('Sin stock');
    expect(statusPhrase({ ...palta, stock: 0.5, expiresOn: null }, 'low', TODAY)).toBe(
      'Faltan 2,5 kg para el mínimo',
    );
  });

  it('names a row with its stock and state', () => {
    expect(supplyRowLabel(palta, 'expiring', TODAY)).toBe('Palta, 4 kg, vence mañana');
  });
});

describe('relativeTime', () => {
  const now = new Date(2026, 10, 27, 15, 0, 0);
  it('reads in minutes, hours, days', () => {
    expect(relativeTime(new Date(2026, 10, 27, 14, 55).toISOString(), now)).toBe('Hace 5 min');
    expect(relativeTime(new Date(2026, 10, 27, 12, 0).toISOString(), now)).toBe('Hace 3 h');
    expect(relativeTime(new Date(2026, 10, 26, 8, 0).toISOString(), now)).toBe('Ayer');
    expect(relativeTime(new Date(2026, 10, 24, 8, 0).toISOString(), now)).toBe('Hace 3 días');
  });
});

describe('movement text', () => {
  it('parses Chilean decimals', () => {
    expect(parseQuantity('0,5')).toBe(0.5);
    expect(parseQuantity('5')).toBe(5);
    expect(parseQuantity('abc')).toBeNull();
    expect(parseQuantity('')).toBeNull();
  });

  it('validates the quantity per kind', () => {
    expect(quantityError('purchase', palta, '')).toBe('Escribe la cantidad');
    expect(quantityError('purchase', palta, '0')).toBe('Indica una cantidad mayor que cero');
    expect(quantityError('waste', palta, '9')).toBe('Solo hay 4 kg en bodega');
    expect(quantityError('adjustment', palta, '0')).toBeNull();
  });

  it('writes the exact action on the button and in the toast', () => {
    expect(submitLabel('purchase', palta, 5)).toBe('Guardar llegada · +5 kg');
    expect(submitLabel('waste', palta, 0.5)).toBe('Registrar pérdida · −0,5 kg');
    expect(submitLabel('adjustment', { stock: 1, unit: 'un' }, 12)).toBe(
      'Guardar conteo · 12 unidades',
    );
    expect(doneMessage('purchase', palta, 5)).toBe('Se registró +5 kg de Palta');
  });

  it('keeps plural labels', () => {
    expect(formatQuantity(1, 'l')).toBe('1 litro');
    expect(formatQuantity(2, 'l')).toBe('2 litros');
  });
});
