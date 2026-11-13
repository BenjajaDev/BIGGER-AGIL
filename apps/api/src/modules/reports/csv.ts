import type { PaymentMethod, SalesReport } from '@bigger/shared';

const METHOD_LABELS: Readonly<Record<PaymentMethod, string>> = {
  cash: 'Efectivo',
  debit: 'Débito',
  junaeb: 'JUNAEB',
};

type Cell = string | number;

const BOM = String.fromCharCode(0xfeff);

/**
 * A cell that starts with = + - @ (or a tab / carriage return) is read as a formula by Excel and
 * Sheets: a product named «=HYPERLINK(…)» would run when someone opens the export. Text cells that
 * start with one of those get an apostrophe in front; numbers are written as they are.
 */
export function safeCell(cell: Cell): string {
  const text = String(cell);
  const dangerous = typeof cell === 'string' && /^[=+\-@\t\r]/.test(text);
  const value = dangerous ? `'${text}` : text;
  return /[";\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** Semicolon-separated with a UTF-8 BOM: what Excel in Spanish opens correctly by double click. */
export function toCsv(rows: readonly (readonly Cell[])[]): string {
  return `${BOM}${rows.map((row) => row.map(safeCell).join(';')).join('\r\n')}\r\n`;
}

export function dailyCsv(report: SalesReport): string {
  return toCsv([
    ['Fecha', 'Ventas (CLP)', 'Pedidos'],
    ...report.byDay.map((day) => [day.date, day.salesClp, day.orders]),
  ]);
}

export function productsCsv(report: SalesReport): string {
  return toCsv([
    ['Producto', 'Unidades', 'Ventas (CLP)'],
    ...report.topProducts.map((product) => [product.name, product.quantity, product.revenueClp]),
  ]);
}

export function paymentsCsv(report: SalesReport): string {
  return toCsv([
    ['Medio de pago', 'Pagos', 'Monto (CLP)'],
    ...report.byMethod.map((entry) => [
      METHOD_LABELS[entry.method],
      entry.payments,
      entry.amountClp,
    ]),
  ]);
}
