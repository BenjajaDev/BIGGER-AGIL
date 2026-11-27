import type { Supplier, Supply } from '@bigger/shared';
import type { MovementInitial, SavedMovement } from '../useMovementForm';
import { ArrivalSheet } from './ArrivalSheet';
import { FichaSheet } from './FichaSheet';
import { SupplyFormSheet } from './SupplyFormSheet';

/** Which supply panel is open: a supply's sheet, the arrival picker, or the create/edit form. */
export type SheetState =
  | { type: 'ficha'; supplyId: string; initial: MovementInitial }
  | { type: 'arrival' }
  | { type: 'supply'; supplyId: string | null };

export function BodegaSheets({
  sheet,
  supplies,
  suppliers,
  onChange,
  onSaved,
}: {
  sheet: SheetState | null;
  supplies: readonly Supply[];
  suppliers: readonly Supplier[];
  onChange: (sheet: SheetState | null) => void;
  onSaved: (saved: SavedMovement) => void;
}) {
  const close = () => {
    onChange(null);
  };
  const find = (id: string | null) => supplies.find((supply) => supply.id === id) ?? null;
  const ficha = sheet?.type === 'ficha' ? sheet : null;
  const form = sheet?.type === 'supply' ? sheet : null;
  const saved = (movement: SavedMovement) => {
    close();
    onSaved(movement);
  };
  return (
    <>
      <FichaSheet
        supply={find(ficha?.supplyId ?? null)}
        initial={ficha?.initial ?? {}}
        onClose={close}
        onSaved={saved}
        onEdit={() => {
          if (ficha) onChange({ type: 'supply', supplyId: ficha.supplyId });
        }}
      />
      <ArrivalSheet
        open={sheet?.type === 'arrival'}
        supplies={supplies}
        onClose={close}
        onSaved={saved}
      />
      <SupplyFormSheet
        open={form !== null}
        supply={find(form?.supplyId ?? null)}
        suppliers={suppliers}
        onClose={close}
      />
    </>
  );
}
