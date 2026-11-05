import type { TicketLine, TicketSize } from '@bigger/shared';

export const PRINTER_CODEPAGES = ['cp858', 'wpc1252', 'ascii'] as const;
export type PrinterCodepage = (typeof PRINTER_CODEPAGES)[number];

export interface EncoderOptions {
  codepage: PrinterCodepage;
  /** Blank lines after the ticket so it clears the tear bar. */
  feedLines: number;
  /** Only for printers with a cutter; the portable 58 mm ones usually have none. */
  cut: boolean;
}

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** `ESC t n`: the printer's own table number for each supported character set. */
const CODEPAGE_NUMBER: Record<Exclude<PrinterCodepage, 'ascii'>, number> = {
  cp858: 19,
  wpc1252: 16,
};

/** Spanish letters and the euro sign in CP858 (CP850 with € in place of dotless i). */
const CP858: ReadonlyMap<string, number> = new Map([
  ['á', 0xa0],
  ['é', 0x82],
  ['í', 0xa1],
  ['ó', 0xa2],
  ['ú', 0xa3],
  ['ñ', 0xa4],
  ['Ñ', 0xa5],
  ['ü', 0x81],
  ['Ü', 0x9a],
  ['Á', 0xb5],
  ['É', 0x90],
  ['Í', 0xd6],
  ['Ó', 0xe0],
  ['Ú', 0xe9],
  ['¿', 0xa8],
  ['¡', 0xad],
  ['€', 0xd5],
  ['°', 0xf8],
]);

const SIZE_BYTE: Record<TicketSize, number> = { normal: 0x00, tall: 0x01, big: 0x11 };
const ALIGN_BYTE = { left: 0, center: 1 } as const;

const REPLACEMENT = 0x3f; // "?"

/** Plain ASCII: accents dropped (á → a), inverted marks flattened, anything else becomes "?". */
function toAscii(character: string): number {
  if (character === '¿') return REPLACEMENT;
  if (character === '¡') return 0x21;
  const base = character.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const code = base.codePointAt(0) ?? REPLACEMENT;
  return base.length === 1 && code >= 0x20 && code < 0x7f ? code : REPLACEMENT;
}

function toCodepage(character: string, codepage: PrinterCodepage): number {
  const code = character.codePointAt(0) ?? REPLACEMENT;
  // Control characters from user notes would be read by the printer as commands: never pass them.
  if (code < 0x20 || code === 0x7f) return 0x20;
  if (code < 0x7f) return code;
  if (codepage === 'cp858') return CP858.get(character) ?? toAscii(character);
  if (codepage === 'wpc1252') {
    if (character === '€') return 0x80;
    return code <= 0xff ? code : toAscii(character);
  }
  return toAscii(character);
}

export function encodeText(text: string, codepage: PrinterCodepage): number[] {
  return Array.from(text, (character) => toCodepage(character, codepage));
}

/** Turns formatted ticket lines into the bytes the printer understands (ESC/POS). */
export function encodeTicket(lines: readonly TicketLine[], options: EncoderOptions): Buffer {
  const bytes: number[] = [ESC, 0x40];
  if (options.codepage !== 'ascii') bytes.push(ESC, 0x74, CODEPAGE_NUMBER[options.codepage]);

  let align = 0;
  let size = 0;
  let bold = 0;
  for (const line of lines) {
    const nextAlign = ALIGN_BYTE[line.align];
    const nextSize = SIZE_BYTE[line.size];
    const nextBold = line.bold ? 1 : 0;
    if (nextAlign !== align) bytes.push(ESC, 0x61, (align = nextAlign));
    if (nextSize !== size) bytes.push(GS, 0x21, (size = nextSize));
    if (nextBold !== bold) bytes.push(ESC, 0x45, (bold = nextBold));
    bytes.push(...encodeText(line.text, options.codepage), LF);
  }

  // Leave the printer as found: the next job must not inherit this one's style.
  bytes.push(ESC, 0x45, 0, GS, 0x21, 0, ESC, 0x61, 0);
  if (options.feedLines > 0) bytes.push(ESC, 0x64, Math.min(options.feedLines, 255));
  if (options.cut) bytes.push(GS, 0x56, 0x01);
  return Buffer.from(bytes);
}
