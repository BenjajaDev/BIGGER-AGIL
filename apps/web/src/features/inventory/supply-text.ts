import {
  supplyAlert,
  type MovementKind,
  UNIT_LABELS,
  type PurchaseGroup,
  type Supply,
  type SupplyInput,
  type SupplyAlert,
} from '@bigger/shared';
import { localToday } from '../../lib/dates';

export const ALERT_LABELS: Readonly<Record<SupplyAlert, string>> = {
  ok: 'En orden',
  low: 'Stock bajo',
  out: 'Sin stock',
  expiring: 'Por vencer',
  expired: 'Vencido',
};

const SINGULAR_LABELS: Partial<Record<Supply['unit'], string>> = { l: 'litro', un: 'unidad' };

export function formatQuantity(quantity: number, unit: Supply['unit']): string {
  const rounded = Math.round(quantity * 100) / 100;
  const label = (rounded === 1 ? SINGULAR_LABELS[unit] : undefined) ?? UNIT_LABELS[unit];
  return `${new Intl.NumberFormat('es-CL').format(rounded)} ${label}`;
}

/** `+5 kg` / `−0,5 kg`: the sign is always written so a change reads as a change. */
export function formatSigned(delta: number, unit: Supply['unit']): string {
  return `${delta < 0 ? '−' : '+'}${formatQuantity(Math.abs(delta), unit)}`;
}

export function daysBetween(date: string, today: string): number {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
}

/** `Vence mañana`, `Venció hace 13 días`: the expiry date in kitchen words. */
export function expiryPhrase(expiresOn: string, today: string): string {
  const days = daysBetween(expiresOn, today);
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  if (days > 1) return `Vence en ${String(days)} días`;
  if (days === -1) return 'Venció ayer';
  return `Venció hace ${String(-days)} días`;
}

/** `Faltan 2,5 kg para el mínimo`; the verb agrees with a single missing unit. */
export function shortagePhrase(supply: Pick<Supply, 'stock' | 'minStock' | 'unit'>): string {
  const missing = Math.max(supply.minStock - supply.stock, 0);
  const verb = Math.round(missing * 100) / 100 === 1 ? 'Falta' : 'Faltan';
  return `${verb} ${formatQuantity(missing, supply.unit)} para el mínimo`;
}

/** The one sentence that says what is wrong with a supply (or that nothing is). */
export function statusPhrase(supply: Supply, alert: SupplyAlert, today: string): string {
  if ((alert === 'expired' || alert === 'expiring') && supply.expiresOn) {
    return expiryPhrase(supply.expiresOn, today);
  }
  if (alert === 'out') return 'Sin stock';
  if (alert === 'low') return shortagePhrase(supply);
  return 'En orden';
}

/** Accessible name of a row: «Palta, 4 kg, vence mañana». */
export function supplyRowLabel(supply: Supply, alert: SupplyAlert, today: string): string {
  const phrase = statusPhrase(supply, alert, today);
  const stock = formatQuantity(supply.stock, supply.unit);
  return `${supply.name}, ${stock}, ${phrase.charAt(0).toLowerCase()}${phrase.slice(1)}`;
}

export const MOVEMENT_LABELS: Readonly<Record<MovementKind, string>> = {
  usage: 'Venta',
  purchase: 'Llegada',
  waste: 'Pérdida',
  adjustment: 'Conteo',
};

/** `Hace 5 min`, `Hace 2 h`, `Ayer`, `Hace 3 días`; older than a week shows the date. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${String(minutes)} min`;
  if (minutes < 360 || localToday(then) === localToday(now)) {
    return `Hace ${String(Math.floor(minutes / 60))} h`;
  }
  const days = daysBetween(localToday(now), localToday(then));
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${String(days)} días`;
  return formatExpiry(localToday(then));
}

const EXPIRY_FORMAT = new Intl.DateTimeFormat('es-CL', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** `2026-11-15` → «dom 15 nov»: the calendar date, read the same in every time zone. */
export function formatExpiry(isoDate: string): string {
  return EXPIRY_FORMAT.format(new Date(`${isoDate}T00:00:00Z`)).replace(/\./g, '');
}

/** The order message for a supplier, ready to send by WhatsApp. */
export function purchaseMessage(group: PurchaseGroup): string {
  const lines = group.items.map(
    (item) => `• ${formatQuantity(item.suggestedQuantity, item.unit)} de ${item.name}`,
  );
  return ['Hola, necesito hacer un pedido para BIGGER:', ...lines, 'Gracias.'].join('\n');
}

export function whatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/** How many supplies are not «En orden», for the tab counter and the summary strip. */
export function countByAlert(
  supplies: readonly Supply[],
  today: string,
): Record<SupplyAlert, number> {
  const counts: Record<SupplyAlert, number> = { ok: 0, low: 0, out: 0, expiring: 0, expired: 0 };
  for (const supply of supplies) counts[supplyAlert(supply, today)] += 1;
  return counts;
}

/** `56912345678` → «+56 9 1234 5678»; anything unexpected is shown as stored. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const match = /^56(\d)(\d{4})(\d{4})$/.exec(digits);
  if (!match) return phone;
  return `+56 ${match[1] ?? ''} ${match[2] ?? ''} ${match[3] ?? ''}`;
}

export const EMPTY_SUPPLY: SupplyInput = {
  name: '',
  unit: 'un',
  minStock: 0,
  costPerUnitClp: 0,
  supplierId: null,
  expiresOn: null,
};
