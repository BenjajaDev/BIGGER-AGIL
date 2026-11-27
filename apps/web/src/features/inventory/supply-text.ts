import {
  supplyAlert,
  UNIT_LABELS,
  type PurchaseGroup,
  type Supply,
  type SupplyInput,
  type SupplyAlert,
} from '@bigger/shared';

export const ALERT_LABELS: Readonly<Record<SupplyAlert, string>> = {
  ok: 'En orden',
  low: 'Stock bajo',
  out: 'Sin stock',
  expiring: 'Por vencer',
  expired: 'Vencido',
};

export function formatQuantity(quantity: number, unit: Supply['unit']): string {
  const rounded = Math.round(quantity * 100) / 100;
  return `${new Intl.NumberFormat('es-CL').format(rounded)} ${UNIT_LABELS[unit]}`;
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
