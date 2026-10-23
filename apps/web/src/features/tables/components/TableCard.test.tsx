import type { TableOverview } from '@bigger/shared';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expectNoA11yViolations } from '../../../test/a11y';
import { TableCard } from './TableCard';

const base: TableOverview = {
  id: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
  number: 2,
  label: 'Mesa 2',
  sortOrder: 2,
  status: 'free',
  checkId: null,
  itemCount: 0,
  openTotalClp: 0,
  paidClp: 0,
  balanceClp: 0,
  openSince: null,
};
const now = new Date('2026-10-21T12:12:00.000Z');

function renderCard(table: TableOverview) {
  return render(
    <MemoryRouter>
      <TableCard table={table} now={now} />
    </MemoryRouter>,
  );
}

describe('TableCard', () => {
  it('starts an order from a free table', () => {
    renderCard(base);
    expect(screen.getByRole('link', { name: 'Mesa 2, Libre' })).toHaveAttribute(
      'href',
      `/pedido?mesa=${base.id}`,
    );
  });

  it('states an occupied table in text and opens its bill', () => {
    renderCard({
      ...base,
      status: 'occupied',
      checkId: '7d6c5b4a-3e2f-4a1b-9c8d-7e6f5a4b3c2d',
      itemCount: 3,
      openSince: '2026-10-21T12:00:00.000Z',
    });
    const link = screen.getByRole('link', { name: 'Mesa 2, Con pedido, 3 productos · 12 min' });
    expect(link).toHaveAttribute('href', `/mesas/${base.id}`);
    expect(screen.getByText('Con pedido')).toBeVisible();
  });

  it('shows what is still owed for a table awaiting payment', () => {
    renderCard({
      ...base,
      status: 'awaiting-payment',
      checkId: '7d6c5b4a-3e2f-4a1b-9c8d-7e6f5a4b3c2d',
      openTotalClp: 9800,
      paidClp: 2000,
      balanceClp: 7800,
    });
    expect(screen.getByText('Por pagar')).toBeInTheDocument();
    expect(screen.getByText(/^Saldo \$\s7\.800$/)).toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = renderCard(base);
    await expectNoA11yViolations(container);
  });
});
