import type { MenuProduct } from '@bigger/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '../../../test/a11y';
import { makeMenuProduct } from '../../../test/fixtures';
import { OptionsModal } from './OptionsModal';

const product: MenuProduct = makeMenuProduct({
  id: 'p-1',
  name: 'Cappuccino',
  priceClp: 3200,
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
});

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

  it('changes the price and the rules with the size', async () => {
    const onConfirm = vi.fn();
    const ensalada = makeMenuProduct({
      name: 'Arma tu ensalada',
      priceClp: 2500,
      modifierGroups: [
        {
          id: 'g-prot',
          name: 'Proteína',
          minSelections: 0,
          maxSelections: 1,
          options: [
            { id: 'o-pollo', name: 'Pollo', priceDeltaClp: 0, isAvailable: true },
            { id: 'o-atun', name: 'Atún', priceDeltaClp: 500, isAvailable: true },
          ],
        },
      ],
      sizes: [
        {
          id: 's-grande',
          name: 'Grande',
          priceClp: 4900,
          groupRules: [{ groupId: 'g-prot', minSelections: 1, maxSelections: 1 }],
        },
        {
          id: 's-pequena',
          name: 'Pequeña',
          priceClp: 2500,
          groupRules: [{ groupId: 'g-prot', minSelections: 0, maxSelections: 0 }],
        },
      ],
    });
    render(<OptionsModal product={ensalada} onClose={vi.fn()} onConfirm={onConfirm} />);

    expect(screen.getByRole('group', { name: /Proteína · elige 1/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /Atún/ }));
    expect(screen.getByRole('button', { name: /Agregar/ })).toHaveTextContent('5.400');

    await userEvent.click(screen.getByRole('radio', { name: /Pequeña/ }));
    expect(screen.queryByRole('group', { name: /Proteína/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Agregar/ }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        size: { sizeId: 's-pequena', sizeName: 'Pequeña', priceClp: 2500 },
        options: [],
      }),
    );
  });
});
