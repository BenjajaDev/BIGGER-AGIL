import type { AdminModifierGroup, AdminProduct } from '@bigger/shared';

/** One line that tells the manager what is configured, without opening the product. */
export function describeProductConfiguration(
  product: AdminProduct,
  groups: readonly Pick<AdminModifierGroup, 'id' | 'name'>[],
): string {
  if (product.kind === 'combo') {
    return product.comboSlots
      .map(
        (slot) => `${slot.name}: ${slot.options.map((option) => option.productName).join(' / ')}`,
      )
      .join(' + ');
  }
  const names = product.modifierGroupIds
    .map((id) => groups.find((group) => group.id === id)?.name)
    .filter((name): name is string => name !== undefined);
  return names.length > 0 ? `Personalizable: ${names.join(', ')}` : 'Sin personalizaciones';
}
