import {
  promotionStatus,
  startingPrice,
  type AdminCategory,
  type AdminProduct,
  type ProductKind,
} from '@bigger/shared';
import {
  ArchiveRestore,
  Combine,
  Package,
  Pencil,
  Plus,
  SearchX,
  Shapes,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { CoverImage } from '../../components/ui/CoverImage';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { UndoToast } from '../../components/ui/UndoToast';
import { localToday } from '../../lib/dates';
import { formatClp } from '../../lib/format';
import styles from './CatalogAdmin.module.css';
import { AdminListRow } from './components/AdminListRow';
import { AvailabilityToggle } from './components/AvailabilityToggle';
import { FlashNotice } from './components/FlashNotice';
import { FormAlert } from './components/FormAlert';
import { ProductFilters } from './components/ProductFilters';
import { ProductStatusBadge } from './components/ProductStatusBadge';
import { QuickAddForm } from './components/QuickAddForm';
import { PRODUCT_KIND_COPY } from './form-values';
import { filterProducts, isFiltering, NO_FILTER, type ProductFilter } from './product-filter';
import { describeProductConfiguration } from './product-summary';
import { PROMOTION_STATUS_BADGE } from './promotion-status';
import {
  useAdminCategories,
  useAdminModifierGroups,
  useAdminProducts,
  useAdminProductTypes,
  useArchiveProduct,
  useRestoreProduct,
  useSetProductAvailability,
} from './useCatalogAdmin';

interface CategoryGroup {
  category: AdminCategory;
  products: AdminProduct[];
}

function groupByCategory(
  products: readonly AdminProduct[],
  categories: readonly AdminCategory[],
): CategoryGroup[] {
  return categories
    .map((category) => ({
      category,
      products: products.filter((product) => product.categoryId === category.id),
    }))
    .filter((group) => group.products.length > 0);
}

function ProductPrice({ product }: { product: AdminProduct }) {
  const from = product.sizes.length > 1 ? 'desde ' : '';
  return (
    <>
      {from}
      {formatClp(startingPrice(product))}
    </>
  );
}

function ProductBadges({
  product,
  typeName,
}: {
  product: AdminProduct;
  typeName: string | undefined;
}) {
  const promotion =
    product.archivedAt === null ? promotionStatus(product.promotion, localToday()) : 'none';
  return (
    <>
      <ProductStatusBadge product={product} />
      {promotion !== 'none' && <StatusBadge {...PROMOTION_STATUS_BADGE[promotion]} />}
      {typeName && <StatusBadge tone="neutral" icon={Shapes} label={typeName} />}
    </>
  );
}

export function ProductListPage({ kind }: { kind: ProductKind }) {
  const copy = PRODUCT_KIND_COPY[kind];
  const [showArchived, setShowArchived] = useState(false);
  const productsQuery = useAdminProducts(showArchived);
  const categoriesQuery = useAdminCategories(true);
  const groupsQuery = useAdminModifierGroups();
  const typesQuery = useAdminProductTypes();
  const activeCategories = (categoriesQuery.data ?? []).filter(
    (category) => category.archivedAt === null,
  );
  const archive = useArchiveProduct();
  const restore = useRestoreProduct();
  const [pendingArchive, setPendingArchive] = useState<AdminProduct | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProductFilter>(NO_FILTER);
  const setAvailability = useSetProductAvailability();
  const [undo, setUndo] = useState<{ product: AdminProduct; message: string } | null>(null);

  /** Puts the product back exactly as it was before the last change. */
  const changeAvailabilityBack = (product: AdminProduct) => {
    setUndo(null);
    setAvailability.mutate(
      { id: product.id, isAvailable: product.isAvailable },
      {
        onError: (error) => {
          setRestoreError(error.message);
        },
      },
    );
  };

  const changeAvailability = (product: AdminProduct, isAvailable: boolean) => {
    setRestoreError(null);
    setAvailability.mutate(
      { id: product.id, isAvailable },
      {
        onSuccess: () => {
          setUndo({
            product,
            message: isAvailable
              ? `«${product.name}» está disponible de nuevo`
              : `«${product.name}» quedó agotado hoy`,
          });
        },
        onError: (error) => {
          setUndo(null);
          setRestoreError(error.message);
        },
      },
    );
  };

  const closeDialog = () => {
    setPendingArchive(null);
    archive.reset();
  };

  return (
    <section className={styles.page}>
      <PageHeader
        title={copy.title}
        actions={
          <>
            <Chip
              pressed={showArchived}
              onClick={() => {
                setShowArchived((value) => !value);
              }}
            >
              Mostrar eliminados
            </Chip>
            <ButtonLink to={`${copy.basePath}/nuevo`} variant="primary">
              <Plus size={20} aria-hidden="true" />
              {copy.newLabel}
            </ButtonLink>
          </>
        }
      />

      <FlashNotice />
      {kind === 'single' && activeCategories.length > 0 && (
        <Card className={styles.formCard}>
          <QuickAddForm categories={activeCategories} />
        </Card>
      )}
      <FormAlert message={restoreError} />

      <AsyncContent query={productsQuery} loadingLabel={`Cargando ${copy.title.toLowerCase()}…`}>
        {(products) => {
          const ofKind = products.filter((product) => product.kind === kind);
          if (ofKind.length === 0) {
            return (
              <EmptyState
                icon={kind === 'combo' ? Combine : Package}
                title={`Todavía no hay ${copy.title.toLowerCase()}`}
                description={
                  kind === 'combo'
                    ? 'Agrupa productos en un combo con precio propio.'
                    : 'Agrega el primero con la carga rápida o con el botón de abajo.'
                }
                action={
                  <ButtonLink to={`${copy.basePath}/nuevo`} variant="primary">
                    <Plus size={20} aria-hidden="true" />
                    {copy.newLabel}
                  </ButtonLink>
                }
              />
            );
          }
          const visible = filterProducts(ofKind, filter, localToday());
          const groups = groupByCategory(visible, categoriesQuery.data ?? []);
          const controls = (
            <ProductFilters
              filter={filter}
              categories={activeCategories}
              shown={visible.length}
              total={ofKind.length}
              onChange={setFilter}
            />
          );
          if (groups.length === 0) {
            return (
              <>
                {controls}
                <EmptyState
                  icon={SearchX}
                  title="Ningún producto coincide"
                  description="Prueba con otra búsqueda o quita algún filtro."
                  action={
                    isFiltering(filter) ? (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setFilter(NO_FILTER);
                        }}
                      >
                        Quitar filtros
                      </Button>
                    ) : undefined
                  }
                />
              </>
            );
          }
          return [
            <div key="controls">{controls}</div>,
            ...groups.map(({ category, products: items }) => (
              <section
                key={category.id}
                className={styles.section}
                aria-labelledby={`cat-${category.id}`}
              >
                <SectionHeader id={`cat-${category.id}`} title={category.name} />
                <ul role="list" className={styles.rows}>
                  {items.map((product) => (
                    <AdminListRow
                      key={product.id}
                      archived={product.archivedAt !== null}
                      leading={
                        <CoverImage
                          image={product.image}
                          motif={product.name}
                          ratio="4 / 3"
                          sizes="4.5rem"
                        />
                      }
                      title={product.name}
                      badges={
                        <ProductBadges
                          product={product}
                          typeName={
                            typesQuery.data?.find((type) => type.id === product.typeId)?.name
                          }
                        />
                      }
                      meta={describeProductConfiguration(product, groupsQuery.data ?? [])}
                      trailing={<ProductPrice product={product} />}
                      actions={
                        product.archivedAt === null ? (
                          <>
                            <AvailabilityToggle
                              product={product}
                              onChange={(isAvailable) => {
                                changeAvailability(product, isAvailable);
                              }}
                            />
                            <ButtonLink to={`${copy.basePath}/${product.id}`} variant="secondary">
                              <Pencil size={18} aria-hidden="true" />
                              Editar<span className="visually-hidden"> {product.name}</span>
                            </ButtonLink>
                            <Button
                              variant="danger"
                              onClick={() => {
                                setPendingArchive(product);
                              }}
                            >
                              <Trash2 size={18} aria-hidden="true" />
                              Eliminar<span className="visually-hidden"> {product.name}</span>
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="secondary"
                            disabled={restore.isPending}
                            onClick={() => {
                              setRestoreError(null);
                              restore.mutate(product.id, {
                                onError: (error) => {
                                  setRestoreError(error.message);
                                },
                              });
                            }}
                          >
                            <ArchiveRestore size={18} aria-hidden="true" />
                            Restaurar<span className="visually-hidden"> {product.name}</span>
                          </Button>
                        )
                      }
                    />
                  ))}
                </ul>
              </section>
            )),
          ];
        }}
      </AsyncContent>

      {undo && (
        <UndoToast
          key={undo.message}
          message={undo.message}
          onUndo={() => {
            changeAvailabilityBack(undo.product);
          }}
          onExpire={() => {
            setUndo(null);
          }}
        />
      )}

      <ConfirmDialog
        open={pendingArchive !== null}
        title={`¿Eliminar «${pendingArchive?.name ?? ''}»?`}
        description={`Dejará de aparecer en la carta y al tomar pedidos. Las comandas anteriores no cambian y puedes restaurar el ${copy.singular} desde «Mostrar eliminados».`}
        confirmLabel="Eliminar"
        isPending={archive.isPending}
        error={archive.error?.message ?? null}
        onClose={closeDialog}
        onConfirm={() => {
          if (pendingArchive) archive.mutate(pendingArchive.id, { onSuccess: closeDialog });
        }}
      />
    </section>
  );
}
