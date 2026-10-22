import { QUICK_NOTES, type MenuProduct } from '@bigger/shared';
import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { controlClassName } from '../../../components/form/control';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { formatClp } from '../../../lib/format';
import type { LineConfig } from '../order-draft';
import { QUICK_NOTE_LABELS } from '../../orders/order-text';
import {
  chooseComboOption,
  initialSelection,
  isSelectionComplete,
  selectionPriceClp,
  toggleOption,
  toLineConfig,
  type OptionSelection,
} from '../product-options';
import styles from './OptionsModal.module.css';

export interface OptionsModalProps {
  product: MenuProduct | null;
  onClose: () => void;
  onConfirm: (config: LineConfig) => void;
}

const EMPTY: OptionSelection = { options: {}, combo: {}, quickNotes: [], note: '' };

export function OptionsModal({ product, onClose, onConfirm }: OptionsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const noteId = useId();
  const [selection, setSelection] = useState<OptionSelection>(EMPTY);

  useEffect(() => {
    if (product) setSelection(initialSelection(product));
  }, [product]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (product && !dialog.open) dialog.showModal();
    if (!product && dialog.open) dialog.close();
  }, [product]);

  if (!product) return <dialog ref={dialogRef} className={styles.dialog} onClose={onClose} />;

  const price = selectionPriceClp(product, selection);
  const complete = isSelectionComplete(product, selection);

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} onClose={onClose}>
      <div className={styles.head}>
        <div>
          <h2 id={titleId} className={styles.name}>
            {product.name}
          </h2>
          <p className={styles.base}>Base {formatClp(product.priceClp)}</p>
        </div>
        <button type="button" className={styles.close} aria-label="Cerrar" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.body}>
        {product.modifierGroups.map((group) => {
          const selected = selection.options[group.id] ?? [];
          const multiple = group.maxSelections > 1;
          return (
            <fieldset key={group.id} className={styles.group}>
              <legend className={styles.legend}>
                {group.name}
                {group.minSelections === 0 && <span className={styles.optional}> · opcional</span>}
              </legend>
              {group.options
                .filter((option) => option.isAvailable)
                .map((option) => (
                  <label key={option.id} className={styles.option}>
                    <input
                      type={multiple ? 'checkbox' : 'radio'}
                      name={group.id}
                      checked={selected.includes(option.id)}
                      onChange={() => {
                        setSelection((current) => toggleOption(current, group, option.id));
                      }}
                    />
                    <span className={styles.optionName}>{option.name}</span>
                    {option.priceDeltaClp > 0 && (
                      <span className={styles.optionPrice}>+{formatClp(option.priceDeltaClp)}</span>
                    )}
                  </label>
                ))}
            </fieldset>
          );
        })}

        {product.comboSlots.map((slot) => (
          <fieldset key={slot.id} className={styles.group}>
            <legend className={styles.legend}>{slot.name}</legend>
            {slot.options
              .filter((option) => option.isAvailable)
              .map((option) => (
                <label key={option.productId} className={styles.option}>
                  <input
                    type="radio"
                    name={slot.id}
                    checked={selection.combo[slot.id] === option.productId}
                    onChange={() => {
                      setSelection((current) =>
                        chooseComboOption(current, slot.id, option.productId),
                      );
                    }}
                  />
                  <span className={styles.optionName}>{option.productName}</span>
                  {option.extraPriceClp > 0 && (
                    <span className={styles.optionPrice}>+{formatClp(option.extraPriceClp)}</span>
                  )}
                </label>
              ))}
          </fieldset>
        ))}

        <div className={styles.group}>
          <p className={styles.legend}>Notas</p>
          <div className={styles.notes} role="group" aria-label="Notas rápidas">
            {QUICK_NOTES.map((note) => (
              <Chip
                key={note}
                compact
                pressed={selection.quickNotes.includes(note)}
                onClick={() => {
                  setSelection((current) => ({
                    ...current,
                    quickNotes: current.quickNotes.includes(note)
                      ? current.quickNotes.filter((value) => value !== note)
                      : [...current.quickNotes, note],
                  }));
                }}
              >
                {QUICK_NOTE_LABELS[note]}
              </Chip>
            ))}
          </div>
          <label htmlFor={noteId} className="visually-hidden">
            Nota para la cocina
          </label>
          <input
            id={noteId}
            type="text"
            className={controlClassName}
            value={selection.note}
            maxLength={140}
            placeholder="Nota para la cocina (opcional)"
            onChange={(event) => {
              setSelection((current) => ({ ...current, note: event.target.value }));
            }}
          />
        </div>
      </div>

      <div className={styles.footer}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!complete}
          onClick={() => {
            onConfirm(toLineConfig(product, selection));
          }}
        >
          Agregar · {formatClp(price)}
        </Button>
      </div>
    </dialog>
  );
}
