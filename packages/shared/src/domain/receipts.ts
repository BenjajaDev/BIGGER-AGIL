import { QUICK_NOTE_LABELS, type Order } from './orders.js';

/** 58 mm paper with font A fits 32 columns; wider printers raise this in the configuration. */
export const DEFAULT_TICKET_COLUMNS = 32;

/** `tall` doubles the height, `big` doubles height and width (so it fits half the columns). */
export type TicketSize = 'normal' | 'tall' | 'big';
export type TicketAlign = 'left' | 'center';

export interface TicketLine {
  text: string;
  align: TicketAlign;
  size: TicketSize;
  bold: boolean;
}

export interface TicketLayout {
  columns: number;
}

const BRAND = 'BIGGER';
const ITEM_INDENT = 5;
const CONTINUATION_INDENT = 2;

/** Characters that fit in one printed line of the given size. */
export function lineCapacity(size: TicketSize, columns: number): number {
  return size === 'big' ? Math.floor(columns / 2) : columns;
}

const line = (text: string, options: Partial<Omit<TicketLine, 'text'>> = {}): TicketLine => ({
  text,
  align: 'left',
  size: 'normal',
  bold: false,
  ...options,
});

const rule = (character: '=' | '-', columns: number): TicketLine => line(character.repeat(columns));

/** Word wrap with a hanging indent; words longer than the line are split. */
export function wrapText(
  text: string,
  width: number,
  firstIndent = 0,
  hangingIndent = 0,
): string[] {
  const lines: string[] = [];
  let current = '';
  let indent = firstIndent;
  const flush = () => {
    lines.push(' '.repeat(indent) + current);
    current = '';
    indent = hangingIndent;
  };
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let rest = word;
    while (rest) {
      const room = width - indent - (current ? current.length + 1 : 0);
      if (rest.length <= room) {
        current = current ? `${current} ${rest}` : rest;
        rest = '';
      } else if (current) {
        flush();
      } else {
        const cut = Math.max(width - indent, 1);
        current = rest.slice(0, cut);
        rest = rest.slice(cut);
        flush();
      }
    }
  }
  if (current || lines.length === 0) flush();
  return lines;
}

/** `left` and `right` on one line, separated by as many spaces as fit. */
export function padBetween(left: string, right: string, width: number): string {
  const gap = Math.max(width - left.length - right.length, 1);
  return `${left}${' '.repeat(gap)}${right}`;
}

export function clockTime(isoDate: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(new Date(isoDate));
}

function ticketTitle(order: Pick<Order, 'channel' | 'tableLabel'>): string {
  switch (order.channel) {
    case 'dine-in':
      return (order.tableLabel ?? 'Mesa').toLocaleUpperCase('es');
    case 'takeaway':
      return 'PARA LLEVAR';
    case 'whatsapp':
      return 'WHATSAPP';
  }
}

type PrintableItem = Order['items'][number];

function groupedOptions(item: PrintableItem): { label: string; names: string[] }[] {
  const groups = new Map<string, string[]>();
  for (const option of item.options) {
    if (option.kind === 'size') continue;
    groups.set(option.label, [...(groups.get(option.label) ?? []), option.name]);
  }
  return [...groups].map(([label, names]) => ({ label, names }));
}

function itemLines(item: PrintableItem, columns: number): TicketLine[] {
  const size = item.options.find((option) => option.kind === 'size');
  const name = item.productName.toLocaleUpperCase('es');
  const title = `${item.quantity} x ${name}${size ? ` (${size.name})` : ''}`;
  const lines = wrapText(title, columns, 0, 4).map((text) =>
    line(text, { size: 'tall', bold: true }),
  );

  for (const { label, names } of groupedOptions(item)) {
    for (const text of wrapText(
      `${label}: ${names.join(', ')}`,
      columns,
      ITEM_INDENT,
      ITEM_INDENT + CONTINUATION_INDENT,
    )) {
      lines.push(line(text));
    }
  }
  if (item.quickNotes.length > 0) {
    const notes = item.quickNotes.map((note) => QUICK_NOTE_LABELS[note]).join(', ');
    for (const text of wrapText(
      `* ${notes}`,
      columns,
      ITEM_INDENT,
      ITEM_INDENT + CONTINUATION_INDENT,
    )) {
      lines.push(line(text, { bold: true }));
    }
  }
  if (item.note) {
    for (const text of wrapText(
      `NOTA: ${item.note}`,
      columns,
      ITEM_INDENT,
      ITEM_INDENT + CONTINUATION_INDENT + 4,
    )) {
      lines.push(line(text, { bold: true }));
    }
  }
  return lines;
}

export interface KitchenTicketInput {
  order: Pick<
    Order,
    'channel' | 'tableLabel' | 'customerName' | 'pickupAt' | 'createdAt' | 'items'
  >;
  /** Which order of the table's bill this is (1 = first); only shown for table orders. */
  sequenceInCheck: number;
  reprint: boolean;
  timeZone: string;
}

/** The comanda for the kitchen: no prices, large table and products, extras indented. */
export function formatKitchenTicket(
  { order, sequenceInCheck, reprint, timeZone }: KitchenTicketInput,
  { columns }: TicketLayout = { columns: DEFAULT_TICKET_COLUMNS },
): TicketLine[] {
  const lines: TicketLine[] = [
    line(BRAND, { align: 'center', size: 'big', bold: true }),
    rule('=', columns),
    ...wrapText(ticketTitle(order), columns).map((text) =>
      line(text, { size: 'tall', bold: true }),
    ),
    line(
      padBetween(
        order.channel === 'dine-in' ? `Pedido ${sequenceInCheck}` : '',
        clockTime(order.createdAt, timeZone),
        columns,
      ),
    ),
  ];
  if (order.customerName) {
    lines.push(...wrapText(`Para: ${order.customerName}`, columns, 0, 6).map((text) => line(text)));
  }
  if (order.pickupAt) {
    lines.push(line(`Retira: ${clockTime(order.pickupAt, timeZone)}`, { bold: true }));
  }
  if (reprint) lines.push(line('*** REIMPRESIÓN ***', { align: 'center', bold: true }));
  lines.push(rule('-', columns));
  for (const item of order.items) lines.push(...itemLines(item, columns));
  lines.push(rule('-', columns));
  return lines;
}

/** A sheet to check width, accents, sizes and bold before the first real comanda. */
export function formatTestTicket(
  { columns }: TicketLayout = { columns: DEFAULT_TICKET_COLUMNS },
): TicketLine[] {
  const ruler = '1234567890'.repeat(Math.ceil(columns / 10)).slice(0, columns);
  return [
    line(BRAND, { align: 'center', size: 'big', bold: true }),
    line('HOJA DE PRUEBA', { align: 'center', bold: true }),
    rule('=', columns),
    line(ruler),
    line('Normal: áéíóú ÁÉÍÓÚ ñ Ñ ü ¿?'),
    line('Negrita: ¡Hola, señor!', { bold: true }),
    line('Alto doble: 2 x CHACARERO', { size: 'tall', bold: true }),
    line('Doble ancho', { size: 'big' }),
    rule('-', columns),
    ...wrapText(
      `Si la regla de arriba se corta, baja PRINTER_COLUMNS. Si ves símbolos raros en vez de acentos, cambia PRINTER_CODEPAGE.`,
      columns,
    ).map((text) => line(text)),
    rule('-', columns),
  ];
}
