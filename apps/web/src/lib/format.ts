const integerFormatter = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

const timeFormatter = new Intl.DateTimeFormat('es-CL', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const MINUTE_MS = 60_000;

/** "$ 3.200" — visual price. */
export function formatClp(amount: number): string {
  return `$ ${integerFormatter.format(amount)}`;
}

/** "3.200 pesos" — how screen readers should announce a price. */
export function formatClpSpoken(amount: number): string {
  return `${integerFormatter.format(amount)} pesos`;
}

export function minutesSince(isoDate: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(isoDate).getTime()) / MINUTE_MS));
}

export function formatElapsed(isoDate: string, now: Date): string {
  const minutes = minutesSince(isoDate, now);
  return minutes === 0 ? 'recién' : `hace ${minutes} min`;
}

export function formatClockTime(isoDate: string): string {
  return timeFormatter.format(new Date(isoDate));
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
