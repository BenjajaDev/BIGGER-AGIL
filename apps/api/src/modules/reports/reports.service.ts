import type {
  CashCloseInput,
  CashCloseSummary,
  ReportKind,
  ReportRange,
  SalesReport,
} from '@bigger/shared';
import { AppError } from '../../core/errors/app-error.js';
import { dailyCsv, paymentsCsv, productsCsv } from './csv.js';
import { addDays } from './local-date.js';
import type { ReportsRepository } from './reports.repository.js';
import { buildCashClose, buildSalesReport, previousRange } from './sales-report.js';

/** Wide enough to hold any local day of the range, whatever the time zone offset; days are filtered after. */
function paddedBounds(from: string, to: string): { start: Date; end: Date } {
  return {
    start: new Date(Date.parse(`${addDays(from, -1)}T00:00:00Z`)),
    end: new Date(Date.parse(`${addDays(to, 2)}T00:00:00Z`)),
  };
}

export class ReportsService {
  readonly #repository: ReportsRepository;
  readonly #timeZone: string;
  readonly #now: () => Date;

  constructor(repository: ReportsRepository, timeZone: string, now: () => Date = () => new Date()) {
    this.#repository = repository;
    this.#timeZone = timeZone;
    this.#now = now;
  }

  async sales(range: ReportRange): Promise<SalesReport> {
    const earliest = previousRange(range).from;
    const { start, end } = paddedBounds(earliest, range.to);
    const [payments, lines, menuProductNames] = await Promise.all([
      this.#repository.paymentsBetween(start, end),
      this.#repository.soldLinesBetween(start, end),
      this.#repository.menuProductNames(),
    ]);
    return buildSalesReport(range, { payments, lines, menuProductNames }, this.#timeZone);
  }

  async export(range: ReportRange, kind: ReportKind): Promise<{ filename: string; csv: string }> {
    const report = await this.sales(range);
    const csv = { daily: dailyCsv, products: productsCsv, payments: paymentsCsv }[kind](report);
    return { filename: `bigger-${kind}-${range.from}-a-${range.to}.csv`, csv };
  }

  async cashClose(date: string): Promise<CashCloseSummary> {
    const { start, end } = paddedBounds(date, date);
    const payments = await this.#repository.paymentsBetween(start, end);
    const summary = buildCashClose(date, payments, this.#timeZone);
    return { ...summary, close: await this.#repository.findClose(date) };
  }

  async closeCash({ date, countedCashClp, note }: CashCloseInput): Promise<CashCloseSummary> {
    if (await this.#repository.findClose(date)) {
      throw new AppError('CONFLICT', 'La caja de ese día ya está cerrada');
    }
    if (date > this.#today()) {
      throw new AppError('CONFLICT', 'No se puede cerrar la caja de un día que aún no ocurre');
    }
    const summary = await this.cashClose(date);
    await this.#repository.saveClose({
      date,
      expectedCashClp: summary.expectedCashClp,
      countedCashClp,
      differenceClp: countedCashClp - summary.expectedCashClp,
      note,
    });
    return this.cashClose(date);
  }

  #today(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: this.#timeZone }).format(this.#now());
  }
}
