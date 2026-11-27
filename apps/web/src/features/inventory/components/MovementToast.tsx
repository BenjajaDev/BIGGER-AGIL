import { UndoToast } from '../../../components/ui/UndoToast';
import { doneMessage } from '../movement-math';
import type { SavedMovement } from '../useMovementForm';
import { useRegisterMovement } from '../useInventory';

/** «Se registró +5 kg de Palta»; Deshacer puts the stock back with a count of the previous amount. */
export function MovementToast({ saved, onDone }: { saved: SavedMovement; onDone: () => void }) {
  const register = useRegisterMovement();
  return (
    <UndoToast
      message={doneMessage(saved.kind, saved.supply, saved.quantity)}
      onExpire={onDone}
      onUndo={() => {
        register.mutate(
          {
            id: saved.supply.id,
            input: {
              kind: 'adjustment',
              quantity: saved.previousStock,
              expiresOn: null,
              note: 'Deshacer',
            },
          },
          { onSettled: onDone },
        );
      }}
    />
  );
}
