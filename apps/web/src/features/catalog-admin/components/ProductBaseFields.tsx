import type { AdminCategory, SingleProductInput } from '@bigger/shared';
import { useFormContext } from 'react-hook-form';
import { Checkbox } from '../../../components/form/Checkbox';
import { controlClassName } from '../../../components/form/control';
import { Field } from '../../../components/form/Field';
import { MoneyInput } from '../../../components/form/MoneyInput';
import styles from '../CatalogAdmin.module.css';

type ProductBaseValues = Pick<
  SingleProductInput,
  'categoryId' | 'name' | 'description' | 'priceClp' | 'isAvailable'
>;

const DESCRIPTION_MAX = 240;

export interface ProductBaseFieldsProps {
  categories: readonly AdminCategory[];
  priceHint: string;
}

/** Fields every product and combo share; rendered inside either form's FormProvider. */
export function ProductBaseFields({ categories, priceHint }: ProductBaseFieldsProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<ProductBaseValues>();
  const descriptionLength = watch('description').length;

  return (
    <>
      <div className={styles.grid2}>
        <Field label="Nombre" error={errors.name?.message}>
          {(control) => (
            <input
              {...control}
              {...register('name')}
              className={controlClassName}
              autoComplete="off"
            />
          )}
        </Field>
        <Field label="Categoría" error={errors.categoryId?.message}>
          {(control) => (
            <select {...control} {...register('categoryId')} className={controlClassName}>
              <option value="">Elige una categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <Field
        label="Descripción para la carta"
        hint={`${descriptionLength}/${DESCRIPTION_MAX} caracteres · se lee en voz alta después del precio`}
        error={errors.description?.message}
      >
        {(control) => (
          <textarea
            {...control}
            {...register('description')}
            className={controlClassName}
            maxLength={DESCRIPTION_MAX}
          />
        )}
      </Field>
      <div className={styles.grid2}>
        <Field label="Precio" hint={priceHint} error={errors.priceClp?.message}>
          {(control) => (
            <MoneyInput {...control} {...register('priceClp', { valueAsNumber: true })} />
          )}
        </Field>
        <div className={styles.alignWithControl}>
          <Checkbox
            {...register('isAvailable')}
            label="Disponible hoy"
            description="Desmárcalo cuando se agote: se oculta de la carta sin eliminarlo."
          />
        </div>
      </div>
    </>
  );
}
