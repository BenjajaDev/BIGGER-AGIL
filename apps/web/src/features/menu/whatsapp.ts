const DEFAULT_MESSAGE = 'Hola BIGGER, quiero hacer un pedido para llevar: ';

export function buildWhatsAppOrderUrl(phoneNumber: string, message = DEFAULT_MESSAGE): string {
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}
