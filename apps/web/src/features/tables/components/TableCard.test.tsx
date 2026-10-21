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
  itemCount: 0,
  openTotalClp: 0,
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
  it('states an occupied table in text, not only with color', () => {
    renderCard({
      ...base,
      status: 'occupied',
      itemCount: 3,
      openSince: '2026-10-21T12:00:00.000Z',
    });
    const link = screen.getByRole('link', { name: 'Mesa 2, Con pedido, 3 productos · 12 min' });
    expect(link).toHaveAttribute('href', `/pedido?mesa=${base.id}`);
    expect(screen.getByText('Con pedido')).toBeVisible();
  });

  it('shows the amount due for a table awaiting payment', () => {
    renderCard({ ...base, status: 'awaiting-payment', openTotalClp: 9800 });
    expect(screen.getByText('Por pagar')).toBeInTheDocument();
    expect(screen.getByText('$ 9.800')).toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = renderCard(base);
    await expectNoA11yViolations(container);
  });
});
