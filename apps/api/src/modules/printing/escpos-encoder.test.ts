import type { TicketLine } from '@bigger/shared';
import { describe, expect, it } from 'vitest';
import { encodeText, encodeTicket, type EncoderOptions } from './escpos-encoder.js';

const OPTIONS: EncoderOptions = { codepage: 'cp858', feedLines: 3, cut: false };
const line = (text: string, overrides: Partial<TicketLine> = {}): TicketLine => ({
  text,
  align: 'left',
  size: 'normal',
  bold: false,
  ...overrides,
});
const hex = (buffer: Buffer) =>
  [...buffer].map((byte) => byte.toString(16).padStart(2, '0')).join(' ');

describe('encodeText', () => {
  it('maps Spanish letters into the chosen character table', () => {
    expect(encodeText('áéíóú ñÑ ¿¡', 'cp858')).toEqual([
      0xa0, 0x82, 0xa1, 0xa2, 0xa3, 0x20, 0xa4, 0xa5, 0x20, 0xa8, 0xad,
    ]);
    expect(encodeText('áéíóú ñÑ ¿¡', 'wpc1252')).toEqual([
      0xe1, 0xe9, 0xed, 0xf3, 0xfa, 0x20, 0xf1, 0xd1, 0x20, 0xbf, 0xa1,
    ]);
  });

  it('drops accents in plain ASCII mode and flattens what cannot be printed', () => {
    expect(Buffer.from(encodeText('Peñón ¿Qué? ¡Sí!', 'ascii')).toString('latin1')).toBe(
      'Penon ?Que? !Si!',
    );
    expect(Buffer.from(encodeText('Café 🍔', 'ascii')).toString('latin1')).toBe('Cafe ?');
  });

  it('never lets user text carry printer commands', () => {
    const note = 'sin sal\u001b@\u001dV\u0001\u0000\u007f';
    const bytes = encodeText(note, 'cp858');
    expect(bytes.every((byte) => byte >= 0x20)).toBe(true);
    expect(bytes).not.toContain(0x1b);
    expect(bytes).not.toContain(0x1d);
  });
});

describe('encodeTicket', () => {
  it('starts with a reset and the character table, then one LF per line', () => {
    const bytes = encodeTicket([line('Hola')], OPTIONS);
    expect(hex(bytes).startsWith('1b 40 1b 74 13 48 6f 6c 61 0a')).toBe(true);
  });

  it('switches style only when it changes and resets it at the end', () => {
    const bytes = encodeTicket(
      [
        line('BIGGER', { align: 'center', size: 'big', bold: true }),
        line('MESA 2', { size: 'tall', bold: true }),
        line('listo'),
      ],
      OPTIONS,
    );
    expect(hex(bytes)).toBe(
      [
        '1b 40 1b 74 13',
        '1b 61 01 1d 21 11 1b 45 01 42 49 47 47 45 52 0a', // center, big, bold
        '1b 61 00 1d 21 01 4d 45 53 41 20 32 0a', // back to left, tall (bold stays on)
        '1d 21 00 1b 45 00 6c 69 73 74 6f 0a', // normal size and no bold
        '1b 45 00 1d 21 00 1b 61 00', // reset
        '1b 64 03', // feed 3 lines
      ].join(' '),
    );
  });

  it('uses the table number of each character set', () => {
    expect(hex(encodeTicket([], { ...OPTIONS, codepage: 'wpc1252' }))).toContain('1b 74 10');
    expect(hex(encodeTicket([], { ...OPTIONS, codepage: 'ascii' }))).not.toContain('1b 74');
  });

  it('feeds paper and cuts only when asked', () => {
    expect(hex(encodeTicket([], { ...OPTIONS, feedLines: 0 }))).not.toContain('1b 64');
    expect(hex(encodeTicket([], { ...OPTIONS, cut: true })).endsWith('1d 56 01')).toBe(true);
    expect(hex(encodeTicket([], OPTIONS)).endsWith('1d 56 01')).toBe(false);
  });
});
