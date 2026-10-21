import type { ComboSlot, ModifierGroup } from '@bigger/shared';
import { formatClp } from '../../lib/format';

const orList = new Intl.ListFormat('es', { type: 'disjunction' });

function withExtra(name: string, extraClp: number): string {
  return extraClp > 0 ? `${name} (+${formatClp(extraClp)})` : name;
}

/** "Café a elección: Americano, Capuchino o Latte (+$ 200)" */
export function describeComboSlot(slot: Pick<ComboSlot, 'name' | 'options'>): string {
  const choices = slot.options.map((option) => withExtra(option.productName, option.extraPriceClp));
  return `${slot.name}: ${orList.format(choices)}`;
}

/** "Tamaño (obligatorio): Normal o Grande (+$ 600)" */
export function describeModifierGroup(
  group: Pick<ModifierGroup, 'name' | 'minSelections' | 'maxSelections' | 'options'>,
): string {
  const rule =
    group.minSelections > 0
      ? 'obligatorio'
      : group.maxSelections > 1
        ? `opcional, hasta ${group.maxSelections}`
        : 'opcional';
  const choices = group.options.map((option) => withExtra(option.name, option.priceDeltaClp));
  return `${group.name} (${rule}): ${orList.format(choices)}`;
}
