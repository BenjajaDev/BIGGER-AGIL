import { describe, expect, it } from 'vitest';
import {
  clockTime,
  formatKitchenTicket,
  formatTestTicket,
  lineCapacity,
  padBetween,
  wrapText,
  type KitchenTicketInput,
  type TicketLine,
} from './receipts.js';

const COLUMNS = 32;

const salad = {
  id: 'i-1',
  productId: 'p-1',
  productName: 'Arma tu ensalada',
  unitPriceClp: 4900,
  quantity: 1,
  quickNotes: [],
  note: 'sin sal',
  options: [
    { kind: 'size' as const, label: 'Tamaño', name: 'Grande', priceDeltaClp: 0 },
    { kind: 'modifier' as const, label: 'Proteína', name: 'Pollo', priceDeltaClp: 0 },
    { kind: 'modifier' as const, label: 'Vegetales', name: 'Apio', priceDeltaClp: 0 },
    { kind: 'modifier' as const, label: 'Vegetales', name: 'Choclo', priceDeltaClp: 0 },
    { kind: 'modifier' as const, label: 'Vegetales', name: 'Pepino', priceDeltaClp: 0 },
    { kind: 'modifier' as const, label: 'Vegetales', name: 'Tomate', priceDeltaClp: 0 },
  ],
};
const chacarero = {
  id: 'i-2',
  productId: 'p-2',
  productName: 'Chacarero',
  unitPriceClp: 4590,
  quantity: 2,
  quickNotes: ['takeaway' as const],
  note: null,
  options: [],
};

const input = (
  overrides: Partial<KitchenTicketInput['order']> = {},
  rest: Partial<KitchenTicketInput> = {},
): KitchenTicketInput => ({
  order: {
    channel: 'dine-in',
    tableLabel: 'Mesa 2',
    customerName: null,
    pickupAt: null,
    createdAt: '2026-11-05T17:32:00.000Z',
    items: [chacarero, salad],
    ...overrides,
  },
  sequenceInCheck: 3,
  reprint: false,
  timeZone: 'America/Santiago',
  ...rest,
});

const texts = (lines: readonly TicketLine[]) => lines.map((l) => l.text);

describe('wrapText', () => {
  it('wraps at word boundaries with a hanging indent', () => {
    expect(wrapText('Vegetales: Apio, Choclo, Pepino, Tomate', 24, 5, 7)).toEqual([
      '     Vegetales: Apio,',
      '       Choclo, Pepino,',
      '       Tomate',
    ]);
  });

  it('splits words longer than the line instead of overflowing', () => {
    const lines = wrapText('Supercalifragilisticoespialidoso', 10);
    expect(lines).toEqual(['Supercalif', 'ragilistic', 'oespialido', 'so']);
  });

  it('returns one empty line for empty text and never exceeds the width', () => {
    expect(wrapText('', 10)).toEqual(['']);
    for (const l of wrapText(
      'una frase bastante larga que debe partirse en varias líneas',
      12,
      3,
      5,
    )) {
      expect(l.length).toBeLessThanOrEqual(12);
    }
  });
});

describe('formatKitchenTicket', () => {
  it('prints the table large, the sequence and the local time, and no prices', () => {
    const lines = formatKitchenTicket(input());
    expect(lines[0]).toMatchObject({ text: 'BIGGER', align: 'center', size: 'big', bold: true });
    expect(lines[2]).toMatchObject({ text: 'MESA 2', size: 'tall', bold: true });
    expect(lines[3]?.text).toBe(padBetween('Pedido 3', '14:32', COLUMNS));
    expect(texts(lines).join('\n')).not.toMatch(/\$|4900|4590/);
  });

  it('lists size beside the product, groups options and flags notes', () => {
    const body = texts(formatKitchenTicket(input()));
    expect(body).toContain('2 x CHACARERO');
    expect(body).toContain('     * Para llevar');
    expect(body).toContain('1 x ARMA TU ENSALADA (Grande)');
    expect(body).toContain('     Proteína: Pollo');
    expect(body).toContain('     Vegetales: Apio, Choclo,');
    expect(body).toContain('       Pepino, Tomate');
    expect(body).toContain('     NOTA: sin sal');
  });

  it('keeps every line inside its size capacity, also on a narrower paper', () => {
    for (const columns of [32, 24]) {
      for (const l of formatKitchenTicket(
        input({ customerName: 'Constanza de los Ángeles Valenzuela' }),
        { columns },
      )) {
        expect(l.text.length).toBeLessThanOrEqual(lineCapacity(l.size, columns));
      }
    }
  });

  it('shows name and pickup time for takeaway and no sequence', () => {
    const lines = formatKitchenTicket(
      input({
        channel: 'whatsapp',
        tableLabel: null,
        customerName: 'Camila R.',
        pickupAt: '2026-11-05T18:10:00.000Z',
      }),
    );
    const body = texts(lines);
    expect(body[2]).toBe('WHATSAPP');
    expect(body[3]).toBe(padBetween('', '14:32', COLUMNS));
    expect(body).toContain('Para: Camila R.');
    expect(body).toContain('Retira: 15:10');
  });

  it('marks a reprint', () => {
    expect(texts(formatKitchenTicket(input({}, { reprint: true })))).toContain(
      '*** REIMPRESIÓN ***',
    );
    expect(texts(formatKitchenTicket(input()))).not.toContain('*** REIMPRESIÓN ***');
  });
});

describe('formatTestTicket', () => {
  it('prints a ruler as wide as the configured columns and samples of every style', () => {
    const lines = formatTestTicket({ columns: 32 });
    expect(lines.find((l) => l.text.startsWith('1234567890'))?.text).toHaveLength(32);
    expect(lines.some((l) => l.size === 'tall')).toBe(true);
    expect(lines.some((l) => l.size === 'big' && l.text !== 'BIGGER')).toBe(true);
    expect(lines.some((l) => l.bold)).toBe(true);
    expect(texts(lines).join('')).toContain('áéíóú');
  });
});

describe('clockTime', () => {
  it('uses the time zone of the shop, not the server', () => {
    expect(clockTime('2026-11-05T17:32:00.000Z', 'America/Santiago')).toBe('14:32');
    expect(clockTime('2026-11-05T17:32:00.000Z', 'UTC')).toBe('17:32');
  });
});
