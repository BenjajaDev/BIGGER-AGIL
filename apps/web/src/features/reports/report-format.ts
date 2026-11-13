import type { ReportRange } from '@bigger/shared';

export const PERIOD_PRESETS = ['today', 'week', 'month30', 'thisMonth', 'custom'] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const PERIOD_LABELS: Readonly<Record<PeriodPreset, string>> = {
  today: 'Hoy',
  week: 'Últimos 7 días',
  month30: 'Últimos 30 días',
  thisMonth: 'Este mes',
  custom: 'Otro período',
};

function shift(date: string, days: number): string {
  const moved = new Date(`${date}T00:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
}

/** The range a preset covers, counting back from `today` (`YYYY-MM-DD`). */
export function presetRange(preset: Exclude<PeriodPreset, 'custom'>, today: string): ReportRange {
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'week':
      return { from: shift(today, -6), to: today };
    case 'month30':
      return { from: shift(today, -29), to: today };
    case 'thisMonth':
      return { from: `${today.slice(0, 8)}01`, to: today };
  }
}

/** Percentage change against the previous period; `null` when there is nothing to compare with. */
export function deltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function formatDelta(delta: number | null): string {
  if (delta === null) return 'sin período anterior';
  if (delta === 0) return 'igual que el período anterior';
  return `${delta > 0 ? '▲' : '▼'} ${String(Math.abs(delta))} % vs período anterior`;
}

export function shortDate(date: string): string {
  const [, month, day] = date.split('-');
  return `${day ?? ''}/${month ?? ''}`;
}
