import {
  MAX_COMBO_SLOTS,
  MAX_OPTIONS_PER_GROUP,
  type AdminProduct,
  type ComboProductInput,
} from '@bigger/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { controlClassName } from '../../../components/form/control';
import { Field, FieldError } from '../../../components/form/Field';
import { MoneyInput } from '../../../components/form/MoneyInput';
import { Checkbox } from '../../../components/form/Checkbox';
import { Button } from '../../../components/ui/Button';
import { cx } from '../../../lib/cx';
import { formatClp } from '../../../lib/format';
import styles from '../CatalogAdmin.module.css';
import formStyles from '../../../components/form/forms.module.css';
import { arrayErrorMessage } from '../form-errors';
import { EMPTY_COMBO_SLOT } from '../form-values';

export interface ProductChoiceGroup {
  categoryName: string;
  products: Pick<AdminProduct, 'id' | 'name' | 'priceClp' | 'isAvailable'>[];
}

interface SlotEditorProps {
  index: number;
  choices: readonly ProductChoiceGroup[];
  onRemove: (() => void) | null;
}

function SlotEditor({ index, choices, onRemove }: SlotEditorProps) {
  const {
    control,
    register,
    watch,
    formState: { errors },
  } = useFormContext<ComboProductInput>();
  const options = useFieldArray({ control, name: `comboSlots.${index}.options`, keyName: 'key' });
  const slotErrors = errors.comboSlots?.[index];
  const slotName = watch(`comboSlots.${index}.name`) || `Espacio ${index + 1}`;

  return (
    <fieldset className={cx(formStyles.fieldset, styles.subCard)}>
      <legend className="visually-hidden">Espacio {index + 1}</legend>
      <div className={styles.subCardHeader}>
        <Field
          label={`Espacio ${index + 1}`}
          hint="Lo que elige el cliente, p. ej. «Café a elección»"
          error={slotErrors?.name?.message}
        >
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
          <Checkbox
            {...register(`comboSlots.${index}.isRequired`)}
            label="Obligatorio"
            description="Si no, el cliente puede dejarlo vacío."
          />
        </div>
        {onRemove && (
          <Button variant="ghost" onClick={onRemove} className={styles.alignWithControl}>
            <Trash2 size={18} aria-hidden="true" />
            Quitar espacio<span className="visually-hidden"> {slotName}</span>
          </Button>
        )}
      </div>

      <fieldset className={formStyles.fieldset}>
        <legend className={formStyles.legend}>Opciones de «{slotName}»</legend>
        <div className={styles.rows}>
          {options.fields.map((option, optionIndex) => {
            const optionErrors = slotErrors?.options?.[optionIndex];
            return (
              <div key={option.key} className={styles.optionRow}>
                <Field
                  label={`Producto ${optionIndex + 1}`}
                  error={optionErrors?.productId?.message}
                >
                  {(controlProps) => (
                    <select
                      {...controlProps}
                      {...register(`comboSlots.${index}.options.${optionIndex}.productId`)}
                      className={controlClassName}
                    >
                      <option value="">Elige un producto</option>
                      {choices.map((group) => (
                        <optgroup key={group.categoryName} label={group.categoryName}>
                          {group.products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} · {formatClp(product.priceClp)}
                              {product.isAvailable ? '' : ' (agotado)'}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="Suma al precio" error={optionErrors?.extraPriceClp?.message}>
                  {(controlProps) => (
                    <MoneyInput
                      {...controlProps}
                      {...register(`comboSlots.${index}.options.${optionIndex}.extraPriceClp`, {
                        valueAsNumber: true,
                      })}
                    />
                  )}
                </Field>
                <Button
                  variant="ghost"
                  className={styles.alignWithControl}
                  disabled={options.fields.length === 1}
                  onClick={() => {
                    options.remove(optionIndex);
                  }}
                  aria-label={`Quitar producto ${optionIndex + 1} de ${slotName}`}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </Button>
              </div>
            );
          })}
        </div>
        {arrayErrorMessage(slotErrors?.options) && (
          <FieldError message={arrayErrorMessage(slotErrors?.options) ?? ''} />
        )}
      </fieldset>

      <div>
        <Button
          variant="secondary"
          disabled={options.fields.length >= MAX_OPTIONS_PER_GROUP}
          onClick={() => {
            options.append({ productId: '', extraPriceClp: 0 });
          }}
        >
          <Plus size={18} aria-hidden="true" />
          Agregar producto a «{slotName}»
        </Button>
      </div>
    </fieldset>
  );
}

export function ComboSlotsEditor({ choices }: { choices: readonly ProductChoiceGroup[] }) {
  const {
    control,
    formState: { errors },
  } = useFormContext<ComboProductInput>();
  const slots = useFieldArray({ control, name: 'comboSlots', keyName: 'key' });
  const slotsError = arrayErrorMessage(errors.comboSlots);

  return (
    <div className={styles.rows}>
      {slots.fields.map((slot, index) => (
        <SlotEditor
          key={slot.key}
          index={index}
          choices={choices}
          onRemove={
            slots.fields.length > 1
              ? () => {
                  slots.remove(index);
                }
              : null
          }
        />
      ))}
      {slotsError && <FieldError message={slotsError} />}
      <div>
        <Button
          variant="secondary"
          disabled={slots.fields.length >= MAX_COMBO_SLOTS}
          onClick={() => {
            slots.append(EMPTY_COMBO_SLOT);
          }}
        >
          <Plus size={18} aria-hidden="true" />
          Agregar espacio
        </Button>
      </div>
    </div>
  );
}
