import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '../../../test/a11y';
import type { DraftLine } from '../order-draft';
import { ComandaPanel, type ComandaPanelProps } from './ComandaPanel';

const capuchino: DraftLine = {
  productId: 'p-1',
  productName: 'Capuchino',
  unitPriceClp: 2500,
  quantity: 2,
  quickNotes: ['no-sugar'],
};

function renderPanel(overrides: Partial<ComandaPanelProps> = {}) {
  const props: ComandaPanelProps = {
    title: 'Comanda · Mesa 2',
    lines: [capuchino],
    totalClp: 5000,
    onIncrement: vi.fn(),
    onDecrement: vi.fn(),
    onToggleNote: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<ComandaPanel {...props} />) };
}

describe('ComandaPanel', () => {
  it('shows the total and announces it in words', () => {
    renderPanel();
    const total = screen.getByText('Total').parentElement;
    expect(total).toHaveTextContent('$ 5.000');
    expect(total).toHaveTextContent('5.000 pesos');
  });

  it('exposes quick notes as toggle buttons', async () => {
    const { props } = renderPanel();
    const noSugar = screen.getByRole('button', { name: 'Sin azúcar' });
    expect(noSugar).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Para llevar' }));
    expect(props.onToggleNote).toHaveBeenCalledWith('p-1', 'takeaway');
  });

  it('sends the comanda to the kitchen', async () => {
    const { props } = renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar a cocina' }));
    expect(props.onSubmit).toHaveBeenCalledOnce();
  });

  it('disables the main action for an empty comanda', () => {
    renderPanel({ lines: [], totalClp: 0 });
    expect(screen.getByText('Comanda vacía')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar a cocina' })).toBeDisabled();
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = renderPanel();
    await expectNoA11yViolations(container);
  });
});
