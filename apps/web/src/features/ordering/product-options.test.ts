import type { ModifierGroup } from '@bigger/shared';
import { makeMenuProduct } from '../../test/fixtures';
import {
  chooseComboOption,
  chooseSize,
  effectiveRules,
  initialSelection,
  isSelectionComplete,
  needsModal,
  selectionPriceClp,
  toggleOption,
  toLineConfig,
} from './product-options';

const option = (id: string, name: string, priceDeltaClp = 0) => ({
  id,
  name,
  priceDeltaClp,
  isAvailable: true,
});

const relleno: ModifierGroup = {
  id: 'g-relleno',
  name: 'Relleno',
  minSelections: 1,
  maxSelections: 1,
  options: [option('o-pastelera', 'Crema pastelera'), option('o-manjar', 'Manjar')],
};
const salsas: ModifierGroup = {
  id: 'g-salsas',
  name: 'Salsas',
  minSelections: 0,
  maxSelections: 2,
  options: [option('o-mayo', 'Mayonesa'), option('o-aji', 'Ají'), option('o-bbq', 'BBQ', 200)],
};
const proteina: ModifierGroup = {
  id: 'g-prot',
  name: 'Proteína',
  minSelections: 0,
  maxSelections: 1,
  options: [option('o-pollo', 'Pollo'), option('o-atun', 'Atún', 500)],
};
const vegetales: ModifierGroup = {
  id: 'g-veg',
  name: 'Vegetales',
  minSelections: 0,
  maxSelections: 4,
  options: ['Apio', 'Tomate', 'Choclo', 'Pepino', 'Zanahoria'].map((name) =>
    option(`o-${name}`, name),
  ),
};

const medialuna = makeMenuProduct({
  name: 'Media luna',
  priceClp: 1300,
  modifierGroups: [relleno],
});
const fajita = makeMenuProduct({ name: 'Italiana', priceClp: 4900, modifierGroups: [salsas] });
const ensalada = makeMenuProduct({
  name: 'Arma tu ensalada',
  priceClp: 2500,
  modifierGroups: [proteina, vegetales],
  sizes: [
    {
      id: 's-grande',
      name: 'Grande',
      priceClp: 4900,
      groupRules: [
        { groupId: 'g-prot', minSelections: 1, maxSelections: 1 },
        { groupId: 'g-veg', minSelections: 4, maxSelections: 4 },
      ],
    },
    {
      id: 's-pequena',
      name: 'Pequeña',
      priceClp: 2500,
      groupRules: [
        { groupId: 'g-prot', minSelections: 0, maxSelections: 0 },
        { groupId: 'g-veg', minSelections: 3, maxSelections: 3 },
      ],
    },
  ],
});

describe('product-options', () => {
  it('needs the modal only when there is something to choose', () => {
    expect(needsModal(medialuna)).toBe(true);
    expect(needsModal(ensalada)).toBe(true);
    expect(needsModal(makeMenuProduct())).toBe(false);
  });

  it('preselects the first option of a required single-choice group', () => {
    const selection = initialSelection(medialuna);
    expect(selection.options['g-relleno']).toEqual(['o-pastelera']);
    expect(isSelectionComplete(medialuna, selection)).toBe(true);
    expect(selectionPriceClp(medialuna, selection)).toBe(1300);
  });

  it('accumulates multi-select options up to the maximum and adds their price', () => {
    let selection = initialSelection(fajita);
    for (const id of ['o-mayo', 'o-bbq', 'o-aji']) {
      selection = toggleOption(
        selection,
        { group: salsas, minSelections: 0, maxSelections: 2 },
        id,
      );
    }
    expect(selection.options['g-salsas']).toEqual(['o-mayo', 'o-bbq']);
    expect(selectionPriceClp(fajita, selection)).toBe(4900 + 200);
    expect(toLineConfig(fajita, selection).options.map((o) => o.optionName)).toEqual([
      'Mayonesa',
      'BBQ',
    ]);
  });

  it('starts on the first size and applies that size rules', () => {
    const selection = initialSelection(ensalada);
    expect(selection.sizeId).toBe('s-grande');
    expect(
      effectiveRules(ensalada, selection).map((rule) => [
        rule.group.name,
        rule.minSelections,
        rule.maxSelections,
      ]),
    ).toEqual([
      ['Proteína', 1, 1],
      ['Vegetales', 4, 4],
    ]);
    // Required single choice is preselected; vegetables still need 4.
    expect(selection.options['g-prot']).toEqual(['o-pollo']);
    expect(isSelectionComplete(ensalada, selection)).toBe(false);
    expect(selectionPriceClp(ensalada, selection)).toBe(4900);
  });

  it('switching to a smaller size drops what it does not offer and trims to its maximum', () => {
    let selection = initialSelection(ensalada);
    const vegRule = { group: vegetales, minSelections: 4, maxSelections: 4 };
    for (const name of ['Apio', 'Tomate', 'Choclo', 'Pepino']) {
      selection = toggleOption(selection, vegRule, `o-${name}`);
    }
    selection = toggleOption(
      selection,
      { group: proteina, minSelections: 1, maxSelections: 1 },
      'o-atun',
    );
    expect(isSelectionComplete(ensalada, selection)).toBe(true);
    expect(selectionPriceClp(ensalada, selection)).toBe(4900 + 500);

    selection = chooseSize(ensalada, selection, 's-pequena');
    expect(selection.options['g-prot']).toBeUndefined();
    expect(selection.options['g-veg']).toEqual(['o-Apio', 'o-Tomate', 'o-Choclo']);
    expect(isSelectionComplete(ensalada, selection)).toBe(true);
    expect(selectionPriceClp(ensalada, selection)).toBe(2500);

    const config = toLineConfig(ensalada, selection);
    expect(config.size).toEqual({ sizeId: 's-pequena', sizeName: 'Pequeña', priceClp: 2500 });
    expect(config.options.map((o) => o.groupName)).toEqual(['Vegetales', 'Vegetales', 'Vegetales']);
  });

  it('leaves optional combo slots empty and requires the mandatory ones', () => {
    const combo = makeMenuProduct({
      kind: 'combo',
      name: 'Churrasco + pastel',
      priceClp: 5500,
      comboSlots: [
        {
          id: 'slot-main',
          name: 'Churrasco',
          isRequired: true,
          options: [
            {
              productId: 'luco',
              productName: 'Luco',
              extraPriceClp: 0,
              isAvailable: true,
              allergens: [],
            },
          ],
        },
        {
          id: 'slot-dessert',
          name: 'Pastel',
          isRequired: false,
          options: [
            {
              productId: 'pie',
              productName: 'Pie limón',
              extraPriceClp: 300,
              isAvailable: true,
              allergens: [],
            },
          ],
        },
      ],
    });
    let selection = initialSelection(combo);
    expect(selection.combo).toEqual({ 'slot-main': 'luco' });
    expect(isSelectionComplete(combo, selection)).toBe(true);

    selection = chooseComboOption(selection, 'slot-dessert', 'pie');
    expect(selectionPriceClp(combo, selection)).toBe(5800);
    selection = chooseComboOption(selection, 'slot-dessert', null);
    expect(toLineConfig(combo, selection).comboChoices.map((choice) => choice.slotName)).toEqual([
      'Churrasco',
    ]);

    selection = chooseComboOption(selection, 'slot-main', null);
    expect(isSelectionComplete(combo, selection)).toBe(false);
  });
});
