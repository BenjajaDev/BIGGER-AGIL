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
