import type { AdminProduct } from '@bigger/shared';
import { Archive, CircleCheck, CircleSlash } from 'lucide-react';
import { StatusBadge } from '../../../components/ui/StatusBadge';

export function ProductStatusBadge({
  product,
}: {
  product: Pick<AdminProduct, 'archivedAt' | 'isAvailable'>;
}) {
  if (product.archivedAt !== null)
    return <StatusBadge tone="neutral" icon={Archive} label="Eliminado" />;
  return product.isAvailable ? (
    <StatusBadge tone="success" icon={CircleCheck} label="Disponible" />
  ) : (
    <StatusBadge tone="warning" icon={CircleSlash} label="Agotado" />
  );
}
