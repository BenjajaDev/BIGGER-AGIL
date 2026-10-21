import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '../../../test/a11y';
import { MenuProductCard } from './MenuProductCard';

const kuchen = {
  id: 'p-1',
  name: 'Kuchen de frambuesa',
  description: 'Masa casera, crema pastelera y frambuesas.',
  priceClp: 3200,
  allergens: ['gluten', 'lacteos', 'huevo'] as const,
  comboSlots: [],
  modifierGroups: [],
};

describe('MenuProductCard', () => {
  it('reads name, price, description and allergens in visual order', () => {
    const { container } = render(
      <MenuProductCard product={{ ...kuchen, allergens: [...kuchen.allergens] }} />,
    );
    const article = screen.getByRole('article', { name: 'Kuchen de frambuesa' });

    expect(article.textContent).toBe(
      'Kuchen de frambuesa$\u00a03.2003.200 pesosMasa casera, crema pastelera y frambuesas.Contiene: Gluten · Lácteos · Huevo',
    );
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('$\u00a03.200');
  });

  it('lists what a combo includes and how a product can be customized', () => {
    render(
      <MenuProductCard
        product={{
          ...kuchen,
          allergens: [],
          comboSlots: [
            {
              id: 's-1',
              name: 'Café a elección',
              options: [
                {
                  productId: 'a',
                  productName: 'Americano',
                  extraPriceClp: 0,
                  isAvailable: true,
                  allergens: [],
                },
                {
                  productId: 'b',
                  productName: 'Latte',
                  extraPriceClp: 200,
                  isAvailable: true,
                  allergens: [],
                },
              ],
            },
          ],
        }}
      />,
    );
    expect(screen.getByText('Incluye')).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent(
      'Café a elección: Americano o Latte (+$ 200)',
    );
  });

  it('states explicitly when a product has no declared allergens', () => {
    render(<MenuProductCard product={{ ...kuchen, allergens: [] }} />);
    expect(screen.getByText('Sin alérgenos declarados')).toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = render(
      <MenuProductCard product={{ ...kuchen, allergens: [...kuchen.allergens] }} />,
    );
    await expectNoA11yViolations(container);
  });
});
