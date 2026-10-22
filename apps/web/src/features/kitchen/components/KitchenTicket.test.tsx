import type { Order } from '@bigger/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { groupByKitchenStatus } from '../useKitchenOrders';
import { KitchenTicket } from './KitchenTicket';

const order: Order = {
  id: '0b8f7c6e-5d4c-4b3a-9f2e-1d0c9b8a7f6e',
  channel: 'dine-in',
  status: 'new',
  tableId: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
  tableLabel: 'Mesa 2',
  customerName: null,
  pickupAt: null,
  items: [
    {
      id: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
      productId: '4f1c2b9e-7a1d-4c3e-9f8a-2b6d5e4c3a21',
      productName: 'Capuchino',
      unitPriceClp: 2500,
      quantity: 2,
      quickNotes: ['no-sugar'],
      note: null,
      options: [],
    },
  ],
  totalClp: 5000,
  createdAt: '2026-10-21T12:00:00.000Z',
  updatedAt: '2026-10-21T12:00:00.000Z',
};

const now = new Date('2026-10-21T12:06:00.000Z');

describe('KitchenTicket', () => {
  it('shows who the order is for, how long it has waited and what to prepare', () => {
    render(<KitchenTicket order={order} now={now} />);
    expect(screen.getByRole('heading', { name: 'Mesa 2' })).toBeInTheDocument();
    expect(screen.getByText('hace 6 min')).toBeInTheDocument();
    expect(screen.getByText('2 × Capuchino · sin azúcar')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('runs the column action with an accessible name that includes the order', async () => {
    const onClick = vi.fn();
    render(
      <KitchenTicket
        order={order}
        now={now}
        action={{ label: 'Empezar', variant: 'primary', onClick }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Empezar: Mesa 2' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('groupByKitchenStatus', () => {
  it('splits orders into kitchen columns and ignores settled ones', () => {
    const grouped = groupByKitchenStatus([
      order,
      { ...order, id: 'b', status: 'ready' },
      { ...order, id: 'c', status: 'paid' },
    ]);
    expect(grouped.new).toHaveLength(1);
    expect(grouped.preparing).toHaveLength(0);
    expect(grouped.ready).toHaveLength(1);
  });
});
