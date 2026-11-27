import type { Supply } from '@bigger/shared';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { controlClassName } from '../../../components/form/control';
import { Sheet } from '../../../components/ui/Sheet';
import { cx } from '../../../lib/cx';
import { matchesQuery } from '../supply-filters';
import { formatQuantity } from '../supply-text';
import type { SavedMovement } from '../useMovementForm';
import { FichaBody } from './FichaBody';
import styles from './Picker.module.css';

function SupplyPicker({
  supplies,
  onPick,
}: {
  supplies: readonly Supply[];
  onPick: (supply: Supply) => void;
}) {
  const [query, setQuery] = useState('');
  const matches = [...supplies]
    .filter((supply) => matchesQuery(supply.name, query))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return (
    <>
      <div className={styles.search}>
        <Search className={styles.searchIcon} size={20} aria-hidden="true" />
        <input
          type="search"
          aria-label="Buscar insumo"
          placeholder="¿Qué llegó?"
          autoComplete="off"
          className={cx(controlClassName, styles.searchInput)}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
      </div>
      {matches.length === 0 ? (
        <p className={styles.empty}>No hay insumos con ese nombre.</p>
      ) : (
        <ul role="list" className={styles.list}>
          {matches.map((supply) => (
            <li key={supply.id}>
              <button
                type="button"
                className={styles.item}
                onClick={() => {
                  onPick(supply);
                }}
              >
                <span className={styles.itemName}>{supply.name}</span>
                <span className={styles.itemMeta}>
                  Hay {formatQuantity(supply.stock, supply.unit)}
                  {supply.supplierName && ` · ${supply.supplierName}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** «Registrar llegada»: pick the supply that arrived, then fill the same form as its sheet. */
export function ArrivalSheet({
  open,
  supplies,
  onClose,
  onSaved,
}: {
  open: boolean;
  supplies: readonly Supply[];
  onClose: () => void;
  onSaved: (saved: SavedMovement) => void;
}) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = supplies.find((supply) => supply.id === pickedId) ?? null;
  const close = () => {
    onClose();
    setPickedId(null);
  };
  return (
    <Sheet
      open={open}
      onClose={close}
      title={picked ? picked.name : 'Registrar llegada'}
      description={picked ? undefined : 'Elige el insumo que llegó.'}
    >
      {open &&
        (picked ? (
          <FichaBody
            key={picked.id}
            supply={picked}
            initial={{ kind: 'purchase' }}
            onSaved={(saved) => {
              setPickedId(null);
              onSaved(saved);
            }}
            onBack={() => {
              setPickedId(null);
            }}
          />
        ) : (
          <SupplyPicker
            supplies={supplies}
            onPick={(supply) => {
              setPickedId(supply.id);
            }}
          />
        ))}
    </Sheet>
  );
}
