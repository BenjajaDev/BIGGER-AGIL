import type { AdminModifierGroup } from '@bigger/shared';
import { formatClp, pluralize } from '../../lib/format';

export function describeOptions(group: Pick<AdminModifierGroup, 'options'>): string {
  return group.options
    .map((option) => {
      const extra = option.priceDeltaClp > 0 ? ` (+${formatClp(option.priceDeltaClp)})` : '';
      const soldOut = option.isAvailable ? '' : ' (agotada)';
      return `${option.name}${extra}${soldOut}`;
    })
    .join(' · ');
}

export function deleteGroupWarning(
  group: Pick<AdminModifierGroup, 'name' | 'productCount'>,
): string {
  const usage =
    group.productCount === 0
      ? 'No está asignada a ningún producto.'
      : `Se quitará de ${pluralize(group.productCount, 'producto', 'productos')}.`;
  return `${usage} Esta acción no se puede deshacer.`;
}
