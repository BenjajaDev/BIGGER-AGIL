import { withRule } from './size-rules';

const vegetales = { id: 'g-veg', minSelections: 0, maxSelections: 4 };

describe('withRule', () => {
  it('fills the missing bound from the group rule when only one number is set', () => {
    expect(withRule([], vegetales, { maxSelections: 3 })).toEqual([
      { groupId: 'g-veg', minSelections: 0, maxSelections: 3 },
    ]);
    expect(withRule([], vegetales, { minSelections: 4 })).toEqual([
      { groupId: 'g-veg', minSelections: 4, maxSelections: 4 },
    ]);
  });

  it('updates an existing override and keeps the other groups', () => {
    const rules = [
      { groupId: 'g-prot', minSelections: 1, maxSelections: 1 },
      { groupId: 'g-veg', minSelections: 4, maxSelections: 4 },
    ];
    expect(withRule(rules, vegetales, { minSelections: 3 })).toEqual([
      { groupId: 'g-prot', minSelections: 1, maxSelections: 1 },
      { groupId: 'g-veg', minSelections: 3, maxSelections: 4 },
    ]);
  });

  it('removes the override when both numbers are cleared', () => {
    const rules = [{ groupId: 'g-veg', minSelections: 3, maxSelections: 3 }];
    expect(withRule(rules, vegetales, { minSelections: null, maxSelections: null })).toEqual([]);
  });
});
