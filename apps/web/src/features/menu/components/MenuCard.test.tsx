import { render, screen, within } from '@testing-library/react';
import { makeMenuProduct } from '../../../test/fixtures';
import { expectNoA11yViolations } from '../../../test/a11y';
import { MenuCard } from './MenuCard';

const proteina = {
  id: 'g-prot',
  name: 'Proteína',
  minSelections: 0,
  maxSelections: 1,
  options: [
    { id: 'pollo', name: 'Pollo', priceDeltaClp: 0, isAvailable: true },
    { id: 'atun', name: 'Atún', priceDeltaClp: 500, isAvailable: true },
  ],
};

const ensalada = makeMenuProduct({
  name: 'Arma tu ensalada',
  subtitle: 'Grande o pequeña, con lechuga incluida',
  priceClp: 2500,
  promotion: { startsOn: null, endsOn: null },
  modifierGroups: [proteina],
  sizes: [
    {
      id: 's-g',
      name: 'Grande',
      priceClp: 4900,
      groupRules: [{ groupId: 'g-prot', minSelections: 1, maxSelections: 1 }],
    },
    {
      id: 's-p',
      name: 'Pequeña',
      priceClp: 2500,
      groupRules: [{ groupId: 'g-prot', minSelections: 0, maxSelections: 0 }],
    },
  ],
});

describe('MenuCard', () => {
  it('follows the standard card structure in reading order', () => {
    render(<MenuCard product={ensalada} />);
    const card = screen.getByRole('article', { name: 'Arma tu ensalada' });
    const text = card.textContent;

    const order = [
      'Promoción',
      'Arma tu ensalada',
      'Grande o pequeña',
      'desde 2.500 pesos',
      'Tamaños',
      'Ingredientes a elección',
      'Sin alérgenos',
    ];
    const positions = order.map((fragment) => text.indexOf(fragment));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('shows each size with its price and what it includes', () => {
    render(<MenuCard product={ensalada} />);
    const sizes = screen
      .getAllByRole('listitem')
      .filter((item) => /Grande|Pequeña/.test(item.textContent));
    expect(within(sizes[0] as HTMLElement).getByText('Proteína: 1')).toBeInTheDocument();
    expect(within(sizes[1] as HTMLElement).getByText('Receta fija')).toBeInTheDocument();
    expect(screen.getByText('4.900 pesos')).toBeInTheDocument();
  });

  it('renders a placeholder header when there is no photo, and the photo when there is', () => {
    const { container, rerender } = render(<MenuCard product={ensalada} />);
    expect(container.querySelector('img')).toBeNull();

    rerender(
      <MenuCard
        product={{
          ...ensalada,
          image: {
            id: '9c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
            width: 1200,
            height: 675,
            focusY: 30,
          },
        }}
      />,
    );
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('alt', '');
    expect(img?.getAttribute('srcset')).toContain('-thumb.webp 480w');
    expect(img).toHaveStyle({ objectPosition: '50% 30%' });
  });

  it('states explicitly when a product has no declared allergens', () => {
    render(<MenuCard product={makeMenuProduct()} />);
    expect(screen.getByText('Sin alérgenos declarados')).toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = render(<MenuCard product={ensalada} />);
    await expectNoA11yViolations(container);
  });
});
