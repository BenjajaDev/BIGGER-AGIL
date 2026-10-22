import { MAX_SIZES_PER_PRODUCT, type SizeInput } from '@bigger/shared';
import { Plus, Ruler, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { controlClassName } from '../../../components/form/control';
import { Field, FieldError } from '../../../components/form/Field';
import { MoneyInput } from '../../../components/form/MoneyInput';
import { Button } from '../../../components/ui/Button';
import styles from '../CatalogAdmin.module.css';
import { arrayErrorMessage } from '../form-errors';

/** Shape shared by the product and product-type forms. */
export interface SizesFormValues {
  sizes: SizeInput[];
  modifierGroupIds: string[];
  priceClp: number | null;
}

const EMPTY_SIZE: SizeInput = { name: '', priceClp: 0, groupRules: [] };

/** Empty number inputs mean "no price" instead of NaN. */
const nullableNumber = (value: unknown) => (value === '' || value === null ? null : Number(value));

export interface SizesEditorProps {
  /** Products show a single price until sizes are added; templates only have sizes. */
  withBasePrice: boolean;
}

export function SizesEditor({ withBasePrice }: SizesEditorProps) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<SizesFormValues>();
  const sizes = useFieldArray({ control, name: 'sizes', keyName: 'key' });
  const sizesError = arrayErrorMessage(errors.sizes);

  const addSize = () => {
    if (withBasePrice && sizes.fields.length === 0) setValue('priceClp', null);
    sizes.append(EMPTY_SIZE);
  };

  return (
    <div className={styles.rows}>
      {withBasePrice && sizes.fields.length === 0 && (
        <Field
          label="Precio"
          hint="Precio único en pesos, sin puntos. Si se vende en distintos tamaños, agrégalos."
          error={errors.priceClp?.message}
        >
          {(controlProps) => (
            <MoneyInput
              {...controlProps}
              {...register('priceClp', { setValueAs: nullableNumber })}
            />
          )}
        </Field>
      )}

      {sizes.fields.map((size, index) => {
        const sizeErrors = errors.sizes?.[index];
        return (
          <div key={size.key} className={styles.optionRow}>
            <Field label={`Tamaño ${index + 1}`} error={sizeErrors?.name?.message}>
              {(controlProps) => (
                <input
                  {...controlProps}
                  {...register(`sizes.${index}.name`)}
                  className={controlClassName}
                  placeholder="Grande, Mediano, Pequeña…"
                  autoComplete="off"
                />
              )}
            </Field>
            <Field label="Precio" error={sizeErrors?.priceClp?.message}>
              {(controlProps) => (
                <MoneyInput
                  {...controlProps}
                  {...register(`sizes.${index}.priceClp`, { valueAsNumber: true })}
                />
              )}
            </Field>
            <Button
              variant="ghost"
              className={styles.alignWithControl}
              onClick={() => {
                sizes.remove(index);
              }}
              aria-label={`Quitar tamaño ${index + 1}`}
            >
              <Trash2 size={18} aria-hidden="true" />
            </Button>
          </div>
        );
      })}
      {sizesError && <FieldError message={sizesError} />}

      <div>
        <Button
          variant="secondary"
          disabled={sizes.fields.length >= MAX_SIZES_PER_PRODUCT}
          onClick={addSize}
        >
          {sizes.fields.length === 0 ? (
            <Ruler size={18} aria-hidden="true" />
          ) : (
            <Plus size={18} aria-hidden="true" />
          )}
          {sizes.fields.length === 0 ? 'Vender en distintos tamaños' : 'Agregar tamaño'}
        </Button>
      </div>
    </div>
  );
}
