import { UNIT_LABELS, type PurchaseGroup, type Supply, type SupplyAlert } from '@bigger/shared';

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
