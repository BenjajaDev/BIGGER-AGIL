import {
  ProductTypeInputSchema,
  type AdminModifierGroup,
  type ProductKind,
  type ProductType,
  type ProductTypeInput,
} from '@bigger/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { SearchX } from 'lucide-react';
import { useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { RouteFallback } from '../../app/RouteFallback';
import { CheckboxGroup } from '../../components/form/CheckboxGroup';
import { controlClassName } from '../../components/form/control';
import { Field } from '../../components/form/Field';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { pluralize } from '../../lib/format';
import styles from './CatalogAdmin.module.css';
import { FormAlert } from './components/FormAlert';
import { SaveBar } from './components/SaveBar';
import { SizeRulesMatrix } from './components/SizeRulesMatrix';
import { SizesEditor } from './components/SizesEditor';
import { TemplateSlotsEditor } from './components/TemplateSlotsEditor';
import { applyServerErrors } from './form-errors';
import { PRODUCT_TYPES_PATH, productTypeDefaults } from './form-values';
import { forKind } from './product-type-text';
import { describeSelectionRule } from './selection-rule';
import { useAdminModifierGroups, useAdminProductType, useSaveProductType } from './useCatalogAdmin';
import { noticeState } from './useFlashNotice';

const KIND_LABELS: Record<ProductKind, string> = {
  single: 'Producto (se arma con tamaños y personalizaciones)',
  combo: 'Combo (el cliente elige un producto por espacio)',
};

interface ProductTypeFormProps {
  type: ProductType | undefined;
  groups: readonly AdminModifierGroup[];
}

function ProductTypeForm({ type, groups }: ProductTypeFormProps) {
  const save = useSaveProductType();
  const navigate = useNavigate();
  const [alert, setAlert] = useState<string | null>(null);
  const form = useForm<ProductTypeInput>({
    resolver: zodResolver(ProductTypeInputSchema),
    mode: 'onTouched',
    defaultValues: productTypeDefaults(type),
  });
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const kind = useWatch({ control, name: 'kind' });

  const onSubmit = form.handleSubmit(async (input) => {
    setAlert(null);
    try {
      const saved = await save.mutateAsync({ id: type?.id, input: forKind(input) });
      await navigate(PRODUCT_TYPES_PATH, { state: noticeState(`Guardado «${saved.name}»`) });
    } catch (error) {
      setAlert(applyServerErrors(error, form.setError));
    }
  });

  return (
    <FormProvider {...form}>
      <form className={styles.form} onSubmit={(event) => void onSubmit(event)} noValidate>
        <FormAlert message={alert} />
        <Card as="section" className={styles.formCard} aria-labelledby="tipo-datos-titulo">
          <h2 id="tipo-datos-titulo" className={styles.sectionTitle}>
            Datos del tipo
          </h2>
          <Field label="Nombre" hint="Ej.: Ensalada armable, Fajita" error={errors.name?.message}>
            {(controlProps) => (
              <input
                {...controlProps}
                {...register('name')}
                className={controlClassName}
                autoComplete="off"
              />
            )}
          </Field>
          <Field
            label="Descripción (opcional)"
            hint="Ayuda a elegir el tipo al crear un producto"
            error={errors.description?.message}
          >
            {(controlProps) => (
              <input
                {...controlProps}
                {...register('description')}
                className={controlClassName}
                maxLength={160}
                autoComplete="off"
              />
            )}
          </Field>
          {type ? (
            <p className={styles.rowMeta}>Sirve para: {KIND_LABELS[type.kind]}</p>
          ) : (
            <Field label="Sirve para" error={errors.kind?.message}>
              {(controlProps) => (
                <select {...controlProps} {...register('kind')} className={controlClassName}>
                  {(Object.keys(KIND_LABELS) as ProductKind[]).map((value) => (
                    <option key={value} value={value}>
                      {KIND_LABELS[value]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}
        </Card>

        {kind === 'single' ? (
          <>
            <Card as="section" className={styles.formCard} aria-labelledby="tipo-tamanos-titulo">
              <h2 id="tipo-tamanos-titulo" className={styles.sectionTitle}>
                Tamaños y precios sugeridos
              </h2>
              <p className={styles.rowMeta}>
                Sin tamaños, cada producto tendrá un precio único que se define al crearlo.
              </p>
              <SizesEditor withBasePrice={false} />
            </Card>
            <Card as="section" className={styles.formCard} aria-labelledby="tipo-reglas-titulo">
              <h2 id="tipo-reglas-titulo" className={styles.sectionTitle}>
                Ingredientes, extras y reglas
              </h2>
              <Controller
                control={control}
                name="modifierGroupIds"
                render={({ field, fieldState }) => (
                  <CheckboxGroup
                    legend="Personalizaciones que trae"
                    options={groups.map((group) => ({
                      value: group.id,
                      label: group.name,
                      description: describeSelectionRule(group.minSelections, group.maxSelections),
                    }))}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <SizeRulesMatrix groups={groups} />
            </Card>
          </>
        ) : (
          <Card as="section" className={styles.formCard} aria-labelledby="tipo-espacios-titulo">
            <h2 id="tipo-espacios-titulo" className={styles.sectionTitle}>
              Espacios del combo
            </h2>
            <p className={styles.rowMeta}>
              Cada combo de este tipo elige qué productos ofrece en cada espacio.
            </p>
            <TemplateSlotsEditor />
          </Card>
        )}
        <SaveBar cancelTo={PRODUCT_TYPES_PATH} isPending={save.isPending} />
      </form>
    </FormProvider>
  );
}

export function ProductTypeEditorPage() {
  const { typeId } = useParams();
  const typeQuery = useAdminProductType(typeId);
  const groupsQuery = useAdminModifierGroups();

  const failed = typeId && typeQuery.isError ? typeQuery.error : groupsQuery.error;
  if (failed) {
    return (
      <EmptyState
        icon={SearchX}
        title="No pudimos abrir este tipo"
        description={failed.message}
        action={<ButtonLink to={PRODUCT_TYPES_PATH}>Volver a Tipos</ButtonLink>}
      />
    );
  }
  if ((typeId && typeQuery.isPending) || groupsQuery.isPending) return <RouteFallback />;

  const type = typeQuery.data;
  return (
    <section className={styles.page} aria-labelledby="editor-titulo">
      <h1 id="editor-titulo" className={styles.title}>
        {type ? `Editar «${type.name}»` : 'Nuevo tipo de producto'}
      </h1>
      <p className={styles.rowMeta}>
        {type && type.productCount > 0
          ? `Creado en ${pluralize(type.productCount, 'producto', 'productos')}. Los cambios solo se aplican a los productos nuevos.`
          : 'Un tipo es una plantilla: al crear un producto con él, parte con estos tamaños, reglas y espacios.'}
      </p>
      <ProductTypeForm key={type?.id ?? 'nuevo'} type={type} groups={groupsQuery.data ?? []} />
    </section>
  );
}
