import type { Order, PaymentMethod, PaymentMode } from '@bigger/shared';
import { Banknote, CreditCard, GraduationCap, type LucideIcon } from 'lucide-react';

export const PAYMENT_METHOD_PRESENTATION: Readonly<
  Record<PaymentMethod, { label: string; icon: LucideIcon }>
> = {
  cash: { label: 'Efectivo', icon: Banknote },
  debit: { label: 'Débito', icon: CreditCard },
  junaeb: { label: 'JUNAEB', icon: GraduationCap },
};

export const PAYMENT_MODE_LABEL: Readonly<Record<PaymentMode, string>> = {
  full: 'Todo',
  items: 'Por productos',
  equal: 'Partes iguales',
};

/** "Juan" when the waiter wrote a name, otherwise "Pedido 2" in the order it was taken. */
export function orderLabel(order: Pick<Order, 'customerName'>, index: number): string {
  return order.customerName ?? `Pedido ${index + 1}`;
}
