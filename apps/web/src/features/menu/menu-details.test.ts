import type { ModifierGroup } from '@bigger/shared';
import {
  describeComboSlot,
  describeModifierGroup,
  describePrice,
  describeRuleRange,
  describeSizeRules,
} from './menu-details';

const option = (name: string, priceDeltaClp = 0) => ({
  id: name,
  name,
  priceDeltaClp,
  isAvailable: true,
});
const group = (name: string, maxSelections: number, options: string[]): ModifierGroup => ({
  id: name,
  name,
  minSelections: 0,
  maxSelections,
  options: options.map((optionName) => option(optionName)),
});

const proteina = group('Proteína', 1, ['Pollo', 'Huevo']);
const vegetales = group('Vegetales', 4, ['Apio', 'Tomate']);

describe('describeRuleRange', () => {
  it.each([
    [1, 1, '1'],
    [0, 3, 'hasta 3'],
    [1, 3, '1 a 3'],
  ])('min %i, max %i → %s', (min, max, expected) => {
    expect(describeRuleRange(min, max)).toBe(expected);
  });
});

describe('describeSizeRules', () => {
  it('lists what a size includes', () => {
    expect(
      describeSizeRules([proteina, vegetales], {
        groupRules: [
          { groupId: 'Proteína', minSelections: 1, maxSelections: 1 },
          { groupId: 'Vegetales', minSelections: 4, maxSelections: 4 },
        ],
      }),
    ).toBe('Proteína: 1 · Vegetales: 4');
  });

  it('calls a size without customizations a fixed recipe', () => {
    expect(
      describeSizeRules([proteina], {
        groupRules: [{ groupId: 'Proteína', minSelections: 0, maxSelections: 0 }],
      }),
    ).toBe('Receta fija');
  });
});

describe('describePrice', () => {
  it('says "desde" when the price depends on the size', () => {
    expect(
      describePrice({
        priceClp: 2500,
        sizes: [
          { id: 'g', name: 'Grande', priceClp: 4900, groupRules: [] },
          { id: 'p', name: 'Pequeña', priceClp: 2500, groupRules: [] },
        ],
      }),
    ).toEqual({ visual: 'desde $ 2.500', spoken: 'desde 2.500 pesos' });
    expect(describePrice({ priceClp: 4590, sizes: [] }).visual).toBe('$ 4.590');
  });
});

describe('describeComboSlot', () => {
  it('lists the choices with their extra price and whether the slot is optional', () => {
    const choice = (productName: string, extraPriceClp = 0) => ({
      productId: productName,
      productName,
      extraPriceClp,
      isAvailable: true,
      allergens: [],
    });
    expect(
      describeComboSlot({
        name: 'Churrasco',
        isRequired: true,
        options: [choice('Luco'), choice('Italiano', 900)],
      }),
    ).toBe('Churrasco (obligatorio): Luco o Italiano (+$ 900)');
    expect(
      describeComboSlot({ name: 'Pastel', isRequired: false, options: [choice('Pie limón')] }),
    ).toBe('Pastel (opcional): Pie limón');
  });
});

describe('describeModifierGroup', () => {
  it('describes optional, mandatory and per-size groups', () => {
    expect(describeModifierGroup(group('Salsas', 3, ['Mayonesa', 'Ajo']))).toBe(
      'Salsas (opcional, hasta 3): Mayonesa y Ajo',
    );
    expect(
      describeModifierGroup({
        name: 'Relleno',
        minSelections: 1,
        maxSelections: 1,
        options: [option('Crema pastelera'), option('Manjar')],
      }),
    ).toBe('Relleno (elige 1): Crema pastelera o Manjar');
    expect(
      describeModifierGroup({ ...proteina, options: [option('Pollo'), option('Atún', 500)] }, true),
    ).toBe('Proteína (según tamaño): Pollo o Atún (+$ 500)');
  });
});
