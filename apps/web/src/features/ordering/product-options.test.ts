import type { MenuProduct } from '@bigger/shared';
import {
  initialSelection,
  isSelectionComplete,
  needsModal,
  selectionPriceClp,
  toggleOption,
  toLineConfig,
} from './product-options';

const milk = {
  id: 'g-milk',
  name: 'Tipo de leche',
  minSelections: 1,
  maxSelections: 1,
  options: [
    { id: 'o-entera', name: 'Entera', priceDeltaClp: 0, isAvailable: true },
    { id: 'o-almendra', name: 'Almendra', priceDeltaClp: 500, isAvailable: true },
  ],
};
const extras = {
  id: 'g-extras',
  name: 'Agregados',
  minSelections: 0,
  maxSelections: 2,
  options: [
    { id: 'o-pollo', name: 'Extra pollo', priceDeltaClp: 1500, isAvailable: true },
    { id: 'o-palta', name: 'Palta', priceDeltaClp: 900, isAvailable: true },
  ],
};

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
  modifierGroups: [milk, extras],
  comboSlots: [],
};

describe('product-options', () => {
  it('needs the modal only when there is something to choose', () => {
    expect(needsModal(product)).toBe(true);
    expect(needsModal({ ...product, modifierGroups: [] })).toBe(false);
  });

  it('preselects the first option of a required single-choice group', () => {
    const selection = initialSelection(product);
    expect(selection.options['g-milk']).toEqual(['o-entera']);
    expect(selection.options['g-extras']).toEqual([]);
    expect(isSelectionComplete(product, selection)).toBe(true);
    expect(selectionPriceClp(product, selection)).toBe(3200);
  });

  it('replaces the choice in a single group and adds the price delta', () => {
    const selection = toggleOption(initialSelection(product), milk, 'o-almendra');
    expect(selection.options['g-milk']).toEqual(['o-almendra']);
    expect(selectionPriceClp(product, selection)).toBe(3700);
  });

  it('accumulates multi-select extras up to the maximum', () => {
    let selection = initialSelection(product);
    selection = toggleOption(selection, extras, 'o-pollo');
    selection = toggleOption(selection, extras, 'o-palta');
    expect(selectionPriceClp(product, selection)).toBe(3200 + 1500 + 900);

    const config = toLineConfig(product, selection);
    expect(config.options.map((option) => option.optionName)).toEqual([
      'Entera',
      'Extra pollo',
      'Palta',
    ]);
  });
});
