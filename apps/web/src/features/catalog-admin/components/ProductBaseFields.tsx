import type { AdminCategory, ComboProductInput, ProductType } from '@bigger/shared';
import { useFormContext } from 'react-hook-form';
import { Checkbox } from '../../../components/form/Checkbox';
import { controlClassName } from '../../../components/form/control';
import { Field } from '../../../components/form/Field';
import { MoneyInput } from '../../../components/form/MoneyInput';
import styles from '../CatalogAdmin.module.css';

type ProductBaseValues = Pick<
  ComboProductInput,
  'categoryId' | 'typeId' | 'name' | 'subtitle' | 'description' | 'priceClp' | 'isAvailable'
>;

const DESCRIPTION_MAX = 240;
const nullableId = (value: unknown) => (value === '' ? null : value);

export interface ProductBaseFieldsProps {
  categories: readonly AdminCategory[];
  types: readonly ProductType[];
  /** Combos keep a single price; simple products set it in the sizes section. */
  priceHint?: string;
}

/** Fields every product and combo share; rendered inside either form's FormProvider. */
export function ProductBaseFields({ categories, types, priceHint }: ProductBaseFieldsProps) {
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
        <Field
          label="Subtítulo (opcional)"
          hint="Una línea bajo el nombre, p. ej. «Elige tamaño y vegetales»"
          error={errors.subtitle?.message}
        >
          {(control) => (
            <input
              {...control}
              {...register('subtitle')}
              className={controlClassName}
              maxLength={80}
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
        <Field label="Tipo de producto (opcional)" error={errors.typeId?.message}>
          {(control) => (
            <select
              {...control}
              {...register('typeId', { setValueAs: nullableId })}
              className={controlClassName}
            >
              <option value="">Sin tipo</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <Field
        label="Descripción para la carta (opcional)"
        hint={`${descriptionLength}/${DESCRIPTION_MAX} caracteres · ingredientes o cómo se prepara`}
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
        {priceHint && (
          <Field label="Precio" hint={priceHint} error={errors.priceClp?.message}>
            {(control) => (
              <MoneyInput {...control} {...register('priceClp', { valueAsNumber: true })} />
            )}
          </Field>
        )}
        <div className={priceHint ? styles.alignWithControl : undefined}>
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
