import { MAX_COMBO_SLOTS, type ProductTypeInput } from '@bigger/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Checkbox } from '../../../components/form/Checkbox';
import { controlClassName } from '../../../components/form/control';
import { Field, FieldError } from '../../../components/form/Field';
import { Button } from '../../../components/ui/Button';
import styles from '../CatalogAdmin.module.css';
import { arrayErrorMessage } from '../form-errors';

const EMPTY_SLOT = { name: '', isRequired: true };

/** The combo's slots without products: each new combo of this type picks its own options. */
export function TemplateSlotsEditor() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ProductTypeInput>();
  const slots = useFieldArray({ control, name: 'comboSlots', keyName: 'key' });
  const listError = arrayErrorMessage(errors.comboSlots);

  return (
    <div className={styles.rows}>
      {slots.fields.map((slot, index) => (
        <div key={slot.key} className={styles.optionRow}>
          <Field label={`Espacio ${index + 1}`} error={errors.comboSlots?.[index]?.name?.message}>
            {(controlProps) => (
              <input
                {...controlProps}
                {...register(`comboSlots.${index}.name`)}
                className={controlClassName}
                autoComplete="off"
              />
            )}
          </Field>
          <div className={styles.alignWithControl}>
            <Checkbox {...register(`comboSlots.${index}.isRequired`)} label="Obligatorio" />
          </div>
          <Button
            variant="ghost"
            className={styles.alignWithControl}
            onClick={() => {
              slots.remove(index);
            }}
          >
            <Trash2 size={18} aria-hidden="true" />
            Quitar<span className="visually-hidden"> espacio {index + 1}</span>
          </Button>
        </div>
      ))}
      {listError && <FieldError message={listError} />}
      <div>
        <Button
          variant="secondary"
          disabled={slots.fields.length >= MAX_COMBO_SLOTS}
          onClick={() => {
            slots.append(EMPTY_SLOT);
          }}
        >
          <Plus size={18} aria-hidden="true" />
          Agregar espacio
        </Button>
      </div>
    </div>
  );
}
