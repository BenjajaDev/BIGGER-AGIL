import {
  ALLERGENS,
  ComboProductInputSchema,
  SingleProductInputSchema,
  type AdminCategory,
  type AdminModifierGroup,
  type AdminProduct,
  type ComboProductInput,
  type ProductKind,
  type SingleProductInput,
} from '@bigger/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Archive } from 'lucide-react';
import { useState } from 'react';
import { Controller, FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { CheckboxGroup } from '../../components/form/CheckboxGroup';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { RouteFallback } from '../../app/RouteFallback';
import { ALLERGEN_LABELS } from '../menu/allergens';
import styles from './CatalogAdmin.module.css';
import { ComboSlotsEditor, type ProductChoiceGroup } from './components/ComboSlotsEditor';
import { FormAlert } from './components/FormAlert';
import { ProductBaseFields } from './components/ProductBaseFields';
import { SaveBar } from './components/SaveBar';
import { applyServerErrors } from './form-errors';
import {
  comboProductDefaults,
  PRODUCT_KIND_COPY,
  singleProductDefaults,
  type ProductKindCopy,
} from './form-values';
import { describeSelectionRule } from './selection-rule';
import {
  useAdminCategories,
  useAdminModifierGroups,
  useAdminProduct,
  useAdminProducts,
  useSaveProduct,
} from './useCatalogAdmin';
import { noticeState } from './useFlashNotice';

const ALLERGEN_OPTIONS = ALLERGENS.map((allergen) => ({
  value: allergen,
  label: ALLERGEN_LABELS[allergen],
}));

function useSubmitProduct<T extends SingleProductInput | ComboProductInput>(
  form: UseFormReturn<T>,
  product: AdminProduct | undefined,
  copy: ProductKindCopy,
) {
  const save = useSaveProduct();
  const navigate = useNavigate();
  const [alert, setAlert] = useState<string | null>(null);

  const onSubmit = form.handleSubmit(async (input) => {
    setAlert(null);
    try {
      const saved = await save.mutateAsync({ id: product?.id, input });
      await navigate(copy.basePath, { state: noticeState(`Guardado «${saved.name}»`) });
    } catch (error) {
      setAlert(applyServerErrors(error, form.setError));
    }
  });

  return { onSubmit, alert, isPending: save.isPending };
}

interface SingleProductFormProps {
  product: AdminProduct | undefined;
  categories: readonly AdminCategory[];
  modifierGroups: readonly AdminModifierGroup[];
}

function SingleProductForm({ product, categories, modifierGroups }: SingleProductFormProps) {
  const copy = PRODUCT_KIND_COPY.single;
  const form = useForm<SingleProductInput>({
    resolver: zodResolver(SingleProductInputSchema),
    mode: 'onTouched',
    defaultValues: singleProductDefaults(product, categories),
  });
  const { onSubmit, alert, isPending } = useSubmitProduct(form, product, copy);

  return (
    <FormProvider {...form}>
      <form className={styles.form} onSubmit={(event) => void onSubmit(event)} noValidate>
        <FormAlert message={alert} />
        <Card as="section" className={styles.formCard} aria-labelledby="datos-titulo">
          <h2 id="datos-titulo" className={styles.sectionTitle}>
            Datos del producto
          </h2>
          <ProductBaseFields
            categories={categories}
            priceHint="Precio base en pesos, sin puntos."
          />
        </Card>
        <Card as="section" className={styles.formCard} aria-label="Alérgenos">
          <Controller
            control={form.control}
            name="allergens"
            render={({ field, fieldState }) => (
              <CheckboxGroup
                legend="Alérgenos"
                hint="Se muestran siempre en texto en la carta."
                options={ALLERGEN_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </Card>
        <Card as="section" className={styles.formCard} aria-label="Personalizaciones">
          <Controller
            control={form.control}
            name="modifierGroupIds"
            render={({ field, fieldState }) => (
              <CheckboxGroup
                legend="Personalizaciones"
                hint="Lo que el cliente puede ajustar a su gusto. Se administran en la pestaña Personalizaciones."
                options={modifierGroups.map((group) => ({
                  value: group.id,
                  label: group.name,
                  description: `${describeSelectionRule(group.minSelections, group.maxSelections)} · ${group.options
                    .map((option) => option.name)
                    .join(', ')}`,
                }))}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          {modifierGroups.length === 0 && (
            <p className={styles.rowMeta}>
              Aún no hay personalizaciones.{' '}
              <Link to="/configuracion/personalizaciones/nueva">Crear la primera</Link>
            </p>
          )}
        </Card>
        <SaveBar cancelTo={copy.basePath} isPending={isPending} />
      </form>
    </FormProvider>
  );
}

interface ComboProductFormProps {
  product: AdminProduct | undefined;
  categories: readonly AdminCategory[];
  choices: readonly ProductChoiceGroup[];
}

function ComboProductForm({ product, categories, choices }: ComboProductFormProps) {
  const copy = PRODUCT_KIND_COPY.combo;
  const form = useForm<ComboProductInput>({
    resolver: zodResolver(ComboProductInputSchema),
    mode: 'onTouched',
    defaultValues: comboProductDefaults(product, categories),
  });
  const { onSubmit, alert, isPending } = useSubmitProduct(form, product, copy);

  return (
    <FormProvider {...form}>
      <form className={styles.form} onSubmit={(event) => void onSubmit(event)} noValidate>
        <FormAlert message={alert} />
        <Card as="section" className={styles.formCard} aria-labelledby="datos-titulo">
          <h2 id="datos-titulo" className={styles.sectionTitle}>
            Datos del combo
          </h2>
          <ProductBaseFields
            categories={categories}
            priceHint="Precio del combo; cada opción puede sumar un extra."
          />
        </Card>
        <Card as="section" className={styles.formCard} aria-labelledby="espacios-titulo">
          <h2 id="espacios-titulo" className={styles.sectionTitle}>
            ¿Qué incluye?
          </h2>
          <p className={styles.rowMeta}>
            Cada espacio es una elección del cliente. Para un combo fijo, deja un solo producto por
            espacio. Los alérgenos se calculan solos a partir de los productos incluidos.
          </p>
          <ComboSlotsEditor choices={choices} />
        </Card>
        <SaveBar cancelTo={copy.basePath} isPending={isPending} />
      </form>
    </FormProvider>
  );
}

function comboChoices(
  products: readonly AdminProduct[],
  categories: readonly AdminCategory[],
): ProductChoiceGroup[] {
  return categories
    .map((category) => ({
      categoryName: category.name,
      products: products.filter(
        (product) =>
          product.kind === 'single' &&
          product.archivedAt === null &&
          product.categoryId === category.id,
      ),
    }))
    .filter((group) => group.products.length > 0);
}

export function ProductEditorPage({ kind }: { kind: ProductKind }) {
  const { productId } = useParams();
  const copy = PRODUCT_KIND_COPY[kind];
  const productQuery = useAdminProduct(productId);
  const categoriesQuery = useAdminCategories(false);
  const groupsQuery = useAdminModifierGroups();
  const productsQuery = useAdminProducts(false);

  const queries = [
    categoriesQuery,
    groupsQuery,
    productsQuery,
    ...(productId ? [productQuery] : []),
  ];
  const failed = queries.find((query) => query.isError);
  if (failed?.error) {
    return (
      <EmptyState
        icon={Archive}
        title={`No pudimos abrir este ${copy.singular}`}
        description={failed.error.message}
        action={<ButtonLink to={copy.basePath}>Volver a {copy.title}</ButtonLink>}
      />
    );
  }
  if (queries.some((query) => query.isPending)) return <RouteFallback />;

  const product = productQuery.data;
  const categories = categoriesQuery.data ?? [];

  if (product && product.kind !== kind) {
    return <Navigate to={`${PRODUCT_KIND_COPY[product.kind].basePath}/${product.id}`} replace />;
  }
  if (product?.archivedAt) {
    return (
      <EmptyState
        icon={Archive}
        title={`«${product.name}» está eliminado`}
        description="Restáuralo desde la lista con «Mostrar eliminados» para poder editarlo."
        action={<ButtonLink to={copy.basePath}>Volver a {copy.title}</ButtonLink>}
      />
    );
  }

  return (
    <section className={styles.page} aria-labelledby="editor-titulo">
      <h1 id="editor-titulo" className={styles.title}>
        {product ? `Editar «${product.name}»` : copy.newLabel}
      </h1>
      {kind === 'single' ? (
        <SingleProductForm
          key={product?.id ?? 'nuevo'}
          product={product}
          categories={categories}
          modifierGroups={groupsQuery.data ?? []}
        />
      ) : (
        <ComboProductForm
          key={product?.id ?? 'nuevo'}
          product={product}
          categories={categories}
          choices={comboChoices(productsQuery.data ?? [], categories)}
        />
      )}
    </section>
  );
}
