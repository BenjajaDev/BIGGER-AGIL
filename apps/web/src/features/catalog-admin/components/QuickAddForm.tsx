import {
  QuickProductInputSchema,
  type AdminCategory,
  type QuickProductInput,
} from '@bigger/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Zap } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { controlClassName } from '../../../components/form/control';
import { Field } from '../../../components/form/Field';
import { MoneyInput } from '../../../components/form/MoneyInput';
import { Button } from '../../../components/ui/Button';
import styles from '../CatalogAdmin.module.css';
import { applyServerErrors } from '../form-errors';
import { quickProductInput } from '../quick-product';
import { useSaveProduct } from '../useCatalogAdmin';
import { FormAlert } from './FormAlert';

/**
 * Name, category and price in one row. The category stays chosen after saving so a whole section
 * of the menu can be loaded in a row; photo, sizes and extras are added later from «Editar».
 */
export function QuickAddForm({ categories }: { categories: readonly AdminCategory[] }) {
  const save = useSaveProduct();
  const [alert, setAlert] = useState<string | null>(null);
  const [saved, setSaved] = useState('');
  const form = useForm<QuickProductInput>({
    resolver: zodResolver(QuickProductInputSchema),
    mode: 'onTouched',
    defaultValues: { categoryId: categories[0]?.id ?? '', name: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (input) => {
    setAlert(null);
    setSaved('');
    try {
      const product = await save.mutateAsync({ id: undefined, input: quickProductInput(input) });
      form.reset({ categoryId: input.categoryId, name: '' });
      form.setFocus('name');
      setSaved(`Agregado «${product.name}». Completa foto y detalles con «Editar».`);
    } catch (error) {
      setAlert(applyServerErrors(error, form.setError));
    }
  });

  return (
    <form
      className={styles.form}
      onSubmit={(event) => void onSubmit(event)}
      noValidate
      aria-labelledby="carga-rapida-titulo"
    >
      <h2 id="carga-rapida-titulo" className={styles.sectionTitle}>
        Carga rápida
      </h2>
      <FormAlert message={alert} />
      <div className={styles.quickRow}>
        <Field label="Nombre" error={errors.name?.message}>
          {(control) => (
            <input
              {...control}
              {...form.register('name')}
              className={controlClassName}
              autoComplete="off"
            />
          )}
        </Field>
        <Field label="Categoría" error={errors.categoryId?.message}>
          {(control) => (
            <select {...control} {...form.register('categoryId')} className={controlClassName}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Precio" error={errors.priceClp?.message}>
          {(control) => (
            <MoneyInput {...control} {...form.register('priceClp', { valueAsNumber: true })} />
          )}
        </Field>
        <Button
          type="submit"
          variant="secondary"
          className={styles.alignWithControl}
          disabled={save.isPending}
        >
          <Zap size={18} aria-hidden="true" />
          Agregar rápido
        </Button>
      </div>
      <p role="status" className={styles.rowMeta}>
        {saved}
      </p>
    </form>
  );
}
