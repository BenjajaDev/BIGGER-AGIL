import { formatKitchenTicket, type KitchenTicketInput, type TicketLine } from '@bigger/shared';

const SAMPLE_ORDER: KitchenTicketInput['order'] = {
  channel: 'dine-in',
  tableLabel: 'Mesa 2',
  customerName: 'Ana',
  pickupAt: null,
  createdAt: '2026-11-05T17:32:00.000Z',
  items: [
    {
      id: 'sample-1',
      productId: 'sample-1',
      productName: 'Chacarero',
      unitPriceClp: 4590,
      quantity: 2,
      quickNotes: ['takeaway'],
      note: null,
      options: [],
    },
    {
      id: 'sample-2',
      productId: 'sample-2',
      productName: 'Arma tu ensalada',
      unitPriceClp: 4900,
      quantity: 1,
      quickNotes: [],
      note: 'sin sal',
      options: [
        { kind: 'size', label: 'Tamaño', name: 'Grande', priceDeltaClp: 0 },
        { kind: 'modifier', label: 'Proteína', name: 'Pollo', priceDeltaClp: 0 },
        { kind: 'modifier', label: 'Vegetales', name: 'Apio', priceDeltaClp: 0 },
        { kind: 'modifier', label: 'Vegetales', name: 'Choclo', priceDeltaClp: 0 },
        { kind: 'modifier', label: 'Vegetales', name: 'Pepino', priceDeltaClp: 0 },
        { kind: 'modifier', label: 'Vegetales', name: 'Tomate', priceDeltaClp: 0 },
      ],
    },
  ],
};

/** The same lines the printer receives, for a made-up order: the manager sees the layout first. */
export function sampleKitchenTicket(columns: number): TicketLine[] {
  return formatKitchenTicket(
    { order: SAMPLE_ORDER, sequenceInCheck: 1, reprint: false, timeZone: 'America/Santiago' },
    { columns },
  );
}
