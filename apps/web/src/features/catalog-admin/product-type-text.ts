import type { AdminModifierGroup, ProductType, ProductTypeInput } from '@bigger/shared';

/** Drops what the other kind uses, so switching kind before saving leaves no hidden leftovers. */
export function forKind(input: ProductTypeInput): ProductTypeInput {
  return input.kind === 'combo'
    ? { ...input, sizes: [], modifierGroupIds: [] }
    : { ...input, comboSlots: [] };
}

/** One line with what a new product of this type starts with. */
export function describeProductType(
  type: ProductType,
  groups: readonly Pick<AdminModifierGroup, 'id' | 'name'>[],
): string {
  if (type.kind === 'combo') {
    return type.comboSlots.length > 0
      ? `Espacios: ${type.comboSlots
          .map((slot) => (slot.isRequired ? slot.name : `${slot.name} (opcional)`))
          .join(' + ')}`
      : 'Sin espacios definidos';
  }
  const names = type.modifierGroupIds
    .map((id) => groups.find((group) => group.id === id)?.name)
    .filter((name): name is string => name !== undefined);
  const parts = [
    type.sizes.length > 0 ? `Tamaños: ${type.sizes.map((size) => size.name).join(' / ')}` : null,
    names.length > 0 ? `Con: ${names.join(', ')}` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(' · ') : 'Solo datos básicos';
}
