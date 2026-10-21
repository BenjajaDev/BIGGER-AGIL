import { MAX_OPTIONS_PER_GROUP, type ModifierGroupInput } from '@bigger/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Checkbox } from '../../../components/form/Checkbox';
import { controlClassName } from '../../../components/form/control';
import { Field, FieldError } from '../../../components/form/Field';
import { MoneyInput } from '../../../components/form/MoneyInput';
import { Button } from '../../../components/ui/Button';
import { cx } from '../../../lib/cx';
import styles from '../CatalogAdmin.module.css';
import { arrayErrorMessage } from '../form-errors';
import { EMPTY_MODIFIER_OPTION } from '../form-values';

export function ModifierOptionsEditor() {
  const {
    control,
    register,
    watch,
    formState: { errors },
  } = useFormContext<ModifierGroupInput>();
  const options = useFieldArray({ control, name: 'options', keyName: 'key' });
  const optionsError = arrayErrorMessage(errors.options);

  return (
    <div className={styles.rows}>
      {options.fields.map((option, index) => {
        const optionErrors = errors.options?.[index];
        const name = watch(`options.${index}.name`) || `opción ${index + 1}`;
        return (
          <div key={option.key} className={cx(styles.optionRow, styles.optionRowWide)}>
            <Field label={`Opción ${index + 1}`} error={optionErrors?.name?.message}>
              {(control) => (
                <input
                  {...control}
                  {...register(`options.${index}.name`)}
                  className={controlClassName}
                  autoComplete="off"
                />
              )}
            </Field>
            <Field label="Suma al precio" error={optionErrors?.priceDeltaClp?.message}>
              {(control) => (
                <MoneyInput
                  {...control}
                  {...register(`options.${index}.priceDeltaClp`, { valueAsNumber: true })}
                />
              )}
            </Field>
            <div className={styles.alignWithControl}>
              <Checkbox {...register(`options.${index}.isAvailable`)} label="Disponible" />
            </div>
            <Button
              variant="ghost"
              className={styles.alignWithControl}
              disabled={options.fields.length === 1}
              onClick={() => {
                options.remove(index);
              }}
              aria-label={`Quitar ${name}`}
            >
              <Trash2 size={18} aria-hidden="true" />
            </Button>
          </div>
        );
      })}
      {optionsError && <FieldError message={optionsError} />}
      <div>
        <Button
          variant="secondary"
          disabled={options.fields.length >= MAX_OPTIONS_PER_GROUP}
          onClick={() => {
            options.append(EMPTY_MODIFIER_OPTION);
          }}
        >
          <Plus size={18} aria-hidden="true" />
          Agregar opción
        </Button>
      </div>
    </div>
  );
}
