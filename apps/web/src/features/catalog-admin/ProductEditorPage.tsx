import {
  ALLERGENS,
  ComboProductInputSchema,
  SingleProductInputSchema,
  type AdminCategory,
  type AdminModifierGroup,
  type AdminProduct,
  type ComboProductInput,
  type ProductKind,
  type ProductType,
  type SingleProductInput,
} from '@bigger/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Archive } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Controller, FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { RouteFallback } from '../../app/RouteFallback';
import { CheckboxGroup } from '../../components/form/CheckboxGroup';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ALLERGEN_LABELS } from '../menu/allergens';
import styles from './CatalogAdmin.module.css';
import { ComboSlotsEditor, type ProductChoiceGroup } from './components/ComboSlotsEditor';
import { FormAlert } from './components/FormAlert';
import { ImageField } from './components/ImageField';
import { LivePreview } from './components/LivePreview';
import { ProductBaseFields } from './components/ProductBaseFields';
import { PromotionFields } from './components/PromotionFields';
import { SaveBar } from './components/SaveBar';
import { SizeRulesMatrix } from './components/SizeRulesMatrix';
import { SizesEditor } from './components/SizesEditor';
import { NO_TYPE, TypePicker } from './components/TypePicker';
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
  useAdminProductTypes,
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

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Card as="section" className={styles.formCard} aria-labelledby={id}>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      {children}
    </Card>
  );
}

function PhotoSection() {
  return (
    <Section id="foto-titulo" title="Foto de la tarjeta">
      <Controller<SingleProductInput, 'image'>
        name="image"
        render={({ field, fieldState }) => (
          <ImageField
            legend="Imagen superior de la tarjeta"
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message ?? undefined}
          />
        )}
      />
    </Section>
  );
}

interface FormSources {
  product: AdminProduct | undefined;
  categories: readonly AdminCategory[];
  modifierGroups: readonly AdminModifierGroup[];
  products: readonly AdminProduct[];
  types: readonly ProductType[];
  template: ProductType | null;
}

function SingleProductForm({
  product,
  categories,
  modifierGroups,
  products,
  types,
  template,
}: FormSources) {
  const copy = PRODUCT_KIND_COPY.single;
  const form = useForm<SingleProductInput>({
    resolver: zodResolver(SingleProductInputSchema),
    mode: 'onTouched',
    defaultValues: singleProductDefaults(product, categories, template),
  });
  const { onSubmit, alert, isPending } = useSubmitProduct(form, product, copy);

  return (
    <FormProvider {...form}>
      <div className={styles.editor}>
        <form className={styles.form} onSubmit={(event) => void onSubmit(event)} noValidate>
          <FormAlert message={alert} />
          <Section id="datos-titulo" title="Datos del producto">
            <ProductBaseFields categories={categories} types={types} />
          </Section>
          <PhotoSection />
          <Section id="precio-titulo" title="Precio y tamaños">
            <SizesEditor withBasePrice />
          </Section>
          <Section id="personalizaciones-titulo" title="Ingredientes, extras y reglas">
            <Controller
              control={form.control}
              name="modifierGroupIds"
              render={({ field, fieldState }) => (
                <CheckboxGroup
                  legend="Personalizaciones que ofrece"
                  hint="Se administran en la pestaña Personalizaciones."
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
            <SizeRulesMatrix groups={modifierGroups} />
          </Section>
          <Section id="alergenos-titulo" title="Alérgenos">
            <Controller
              control={form.control}
              name="allergens"
              render={({ field, fieldState }) => (
                <CheckboxGroup
                  legend="Contiene"
                  hint="Se muestran siempre en texto en la carta."
                  options={ALLERGEN_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />
          </Section>
          <Section id="promocion-titulo" title="Promoción">
            <PromotionFields />
          </Section>
          <SaveBar cancelTo={copy.basePath} isPending={isPending} />
        </form>
        <LivePreview kind="single" groups={modifierGroups} products={products} />
      </div>
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

function ComboProductForm({
  product,
  categories,
  modifierGroups,
  products,
  types,
  template,
}: FormSources) {
  const copy = PRODUCT_KIND_COPY.combo;
  const form = useForm<ComboProductInput>({
    resolver: zodResolver(ComboProductInputSchema),
    mode: 'onTouched',
    defaultValues: comboProductDefaults(product, categories, template),
  });
  const { onSubmit, alert, isPending } = useSubmitProduct(form, product, copy);

  return (
    <FormProvider {...form}>
      <div className={styles.editor}>
        <form className={styles.form} onSubmit={(event) => void onSubmit(event)} noValidate>
          <FormAlert message={alert} />
          <Section id="datos-titulo" title="Datos del combo">
            <ProductBaseFields
              categories={categories}
              types={types}
              priceHint="Precio del combo; cada opción puede sumar un extra."
            />
          </Section>
          <PhotoSection />
          <Section id="espacios-titulo" title="¿Qué incluye?">
            <p className={styles.rowMeta}>
              Cada espacio es una elección del cliente («Café», «Donut»). Márcalo como opcional si
              se puede dejar vacío. Para un combo fijo, deja un solo producto por espacio. Los
              alérgenos se calculan solos.
            </p>
            <ComboSlotsEditor choices={comboChoices(products, categories)} />
          </Section>
          <Section id="promocion-titulo" title="Promoción">
            <PromotionFields />
          </Section>
          <SaveBar cancelTo={copy.basePath} isPending={isPending} />
        </form>
        <LivePreview kind="combo" groups={modifierGroups} products={products} />
      </div>
    </FormProvider>
  );
}

export function ProductEditorPage({ kind }: { kind: ProductKind }) {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const copy = PRODUCT_KIND_COPY[kind];
  const productQuery = useAdminProduct(productId);
  const categoriesQuery = useAdminCategories(false);
  const groupsQuery = useAdminModifierGroups();
  const productsQuery = useAdminProducts(false);
  const typesQuery = useAdminProductTypes();

  const queries = [
    categoriesQuery,
    groupsQuery,
    productsQuery,
    typesQuery,
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
  const types = (typesQuery.data ?? []).filter((type) => type.kind === kind);
  const chosenType = searchParams.get('tipo');

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

  const title = product ? `Editar «${product.name}»` : copy.newLabel;
  if (!product && chosenType === null && types.length > 0) {
    return (
      <section className={styles.page} aria-labelledby="editor-titulo">
        <h1 id="editor-titulo" className={styles.title}>
          {title}
        </h1>
        <TypePicker types={types} />
      </section>
    );
  }

  const template =
    chosenType && chosenType !== NO_TYPE
      ? (types.find((type) => type.id === chosenType) ?? null)
      : null;
  const sources: FormSources = {
    product,
    categories: categoriesQuery.data ?? [],
    modifierGroups: groupsQuery.data ?? [],
    products: productsQuery.data ?? [],
    types,
    template,
  };

  return (
    <section className={styles.page} aria-labelledby="editor-titulo">
      <div className={styles.header}>
        <h1 id="editor-titulo" className={styles.title}>
          {title}
        </h1>
        {template && (
          <p className={styles.rowMeta}>
            Basado en «{template.name}» · <Link to="?">Cambiar tipo</Link>
          </p>
        )}
      </div>
      {kind === 'single' ? (
        <SingleProductForm key={`${product?.id ?? 'nuevo'}-${chosenType ?? ''}`} {...sources} />
      ) : (
        <ComboProductForm key={`${product?.id ?? 'nuevo'}-${chosenType ?? ''}`} {...sources} />
      )}
    </section>
  );
}
