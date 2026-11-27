import type { Supply } from '@bigger/shared';
import { Sheet } from '../../../components/ui/Sheet';
import type { MovementInitial, SavedMovement } from '../useMovementForm';
import { FichaBody } from './FichaBody';

/** The supply sheet: stock at the top, one form for the daily movements, rare actions last. */
export function FichaSheet({
  supply,
  initial,
  onClose,
  onSaved,
  onEdit,
}: {
  supply: Supply | null;
  initial: MovementInitial;
  onClose: () => void;
  onSaved: (saved: SavedMovement) => void;
  onEdit: () => void;
}) {
  return (
    <Sheet open={supply !== null} onClose={onClose} title={supply?.name ?? 'Insumo'}>
      {supply && (
        <FichaBody
          key={supply.id}
          supply={supply}
          initial={initial}
          onSaved={onSaved}
          onEdit={onEdit}
          onDeleted={onClose}
        />
      )}
    </Sheet>
  );
}
