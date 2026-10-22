import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '../../../test/a11y';
import type { DraftLine } from '../order-draft';
import { ComandaPanel, type ComandaPanelProps } from './ComandaPanel';

const capuchino: DraftLine = {
  lineId: 'l-1',
  productId: 'p-1',
  productName: 'Capuchino',
  basePriceClp: 2500,
  quantity: 2,
  quickNotes: ['no-sugar'],
  note: '',
  options: [
    {
      groupId: 'g-1',
      groupName: 'Tipo de leche',
      optionId: 'o-1',
      optionName: 'Almendra',
      priceDeltaClp: 500,
    },
  ],
  comboChoices: [],
};

function renderPanel(overrides: Partial<ComandaPanelProps> = {}) {
  const props: ComandaPanelProps = {
    heading: 'Mesa 2',
    subtitle: 'Para servir en sala',
    customerName: '',
    requireName: false,
    lines: [capuchino],
    totalClp: 6000,
    onSetCustomerName: vi.fn(),
    onIncrement: vi.fn(),
    onDecrement: vi.fn(),
    onSetNote: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<ComandaPanel {...props} />) };
}

describe('ComandaPanel', () => {
  it('shows the subtotal, suggested tip and total with tip', () => {
    renderPanel();
    expect(screen.getByText('Subtotal').parentElement).toHaveTextContent('$ 6.000');
    expect(screen.getByText('Propina sugerida (10%)').parentElement).toHaveTextContent('$ 600');
    const total = screen.getByText('6.600 pesos').parentElement;
    expect(total).toHaveTextContent('$ 6.600');
    expect(total).toHaveTextContent('Total con propina');
  });

  it('lists the chosen options and notes as detail', () => {
    renderPanel();
    expect(screen.getByText('• Almendra')).toBeInTheDocument();
    expect(screen.getByText('• Sin azúcar')).toBeInTheDocument();
  });

  it('adjusts the quantity by line', async () => {
    const { props } = renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Sumar un Capuchino' }));
    expect(props.onIncrement).toHaveBeenCalledWith('l-1');
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

  it('hides the name field for dine-in orders', () => {
    renderPanel();
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
  });

  it('requires a name before sending a takeaway order', () => {
    renderPanel({ requireName: true, customerName: '' });
    expect(screen.getByLabelText('Nombre')).toBeRequired();
    expect(screen.getByRole('button', { name: 'Enviar a cocina' })).toBeDisabled();
  });

  it('enables sending once the takeaway name is filled', () => {
    renderPanel({ requireName: true, customerName: 'Javier' });
    expect(screen.getByRole('button', { name: 'Enviar a cocina' })).toBeEnabled();
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = renderPanel();
    await expectNoA11yViolations(container);
  });
});
