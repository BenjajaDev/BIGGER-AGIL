import type { MenuProduct } from '@bigger/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '../../../test/a11y';
import { OptionsModal } from './OptionsModal';

const product: MenuProduct = {
  id: 'p-1',
  categoryId: 'c-1',
  kind: 'single',
  name: 'Cappuccino',
  description: '',
  priceClp: 3200,
  allergens: [],
  isAvailable: true,
  sortOrder: 0,
  modifierGroups: [
    {
      id: 'g-milk',
      name: 'Tipo de leche',
      minSelections: 1,
      maxSelections: 1,
      options: [
        { id: 'o-entera', name: 'Entera', priceDeltaClp: 0, isAvailable: true },
        { id: 'o-almendra', name: 'Almendra', priceDeltaClp: 500, isAvailable: true },
      ],
    },
  ],
  comboSlots: [],
};

describe('OptionsModal', () => {
  it('opens with the product and confirms the chosen customization', async () => {
    const onConfirm = vi.fn();
    render(<OptionsModal product={product} onClose={vi.fn()} onConfirm={onConfirm} />);

    const dialog = screen.getByRole('dialog', { name: 'Cappuccino' });
    expect(dialog).toHaveAttribute('open');

    await userEvent.click(screen.getByRole('radio', { name: /Almendra/ }));
    await userEvent.click(screen.getByRole('button', { name: /Agregar/ }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [expect.objectContaining({ optionName: 'Almendra', priceDeltaClp: 500 })],
      }),
    );
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = render(
      <OptionsModal product={product} onClose={vi.fn()} onConfirm={vi.fn()} />,
    );
    await expectNoA11yViolations(container);
  });
});
