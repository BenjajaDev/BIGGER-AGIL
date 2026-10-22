import type { AdminModifierGroup, AdminProduct } from '@bigger/shared';

/** One line that tells the manager what is configured, without opening the product. */
export function describeProductConfiguration(
  product: AdminProduct,
  groups: readonly Pick<AdminModifierGroup, 'id' | 'name'>[],
): string {
  if (product.kind === 'combo') {
    return product.comboSlots
      .map((slot) => {
        const choices = slot.options.map((option) => option.productName).join(' / ');
        return `${slot.name}${slot.isRequired ? '' : ' (opcional)'}: ${choices}`;
      })
      .join(' + ');
  }
  const names = product.modifierGroupIds
    .map((id) => groups.find((group) => group.id === id)?.name)
    .filter((name): name is string => name !== undefined);
  const parts = [
    product.sizes.length > 0
      ? `Tamaños: ${product.sizes.map((size) => size.name).join(' / ')}`
      : null,
    names.length > 0 ? `Personalizable: ${names.join(', ')}` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(' · ') : 'Sin personalizaciones';
}
