import type { AdminCategory, AdminProduct, ProductKind } from '@bigger/shared';
import { ArchiveRestore, Pencil, Plus, SearchX, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { cx } from '../../lib/cx';
import { formatClp } from '../../lib/format';
import styles from './CatalogAdmin.module.css';
import { FlashNotice } from './components/FlashNotice';
import { FormAlert } from './components/FormAlert';
import { ProductStatusBadge } from './components/ProductStatusBadge';
import { PRODUCT_KIND_COPY } from './form-values';
import { describeProductConfiguration } from './product-summary';
import {
  useAdminCategories,
  useAdminModifierGroups,
  useAdminProducts,
  useArchiveProduct,
  useRestoreProduct,
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

export function ProductListPage({ kind }: { kind: ProductKind }) {
  const copy = PRODUCT_KIND_COPY[kind];
  const [showArchived, setShowArchived] = useState(false);
  const productsQuery = useAdminProducts(showArchived);
  const categoriesQuery = useAdminCategories(true);
  const groupsQuery = useAdminModifierGroups();
  const archive = useArchiveProduct();
  const restore = useRestoreProduct();
  const [pendingArchive, setPendingArchive] = useState<AdminProduct | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const closeDialog = () => {
    setPendingArchive(null);
    archive.reset();
  };

  return (
    <section className={styles.page} aria-labelledby="lista-titulo">
      <div className={styles.header}>
        <h1 id="lista-titulo" className={styles.title}>
          {copy.title}
        </h1>
        <div className={styles.headerActions}>
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
        </div>
      </div>

      <FlashNotice />
      <FormAlert message={restoreError} />

      <AsyncContent query={productsQuery} loadingLabel={`Cargando ${copy.title.toLowerCase()}…`}>
        {(products) => {
          const ofKind = products.filter((product) => product.kind === kind);
          const groups = groupByCategory(ofKind, categoriesQuery.data ?? []);
          if (groups.length === 0) {
            return (
              <EmptyState icon={SearchX} title={`Todavía no hay ${copy.title.toLowerCase()}`} />
            );
          }
          return groups.map(({ category, products: items }) => (
            <section
              key={category.id}
              className={styles.section}
              aria-labelledby={`cat-${category.id}`}
            >
              <h2 id={`cat-${category.id}`} className={styles.sectionTitle}>
                {category.name}
              </h2>
              <ul role="list" className={styles.rows}>
                {items.map((product) => (
                  <Card
                    as="li"
                    key={product.id}
                    padded={false}
                    className={cx(styles.row, product.archivedAt !== null && styles.rowArchived)}
                  >
                    <div className={styles.rowMain}>
                      <span className={styles.rowTitle}>
                        {product.name}
                        <ProductStatusBadge product={product} />
                      </span>
                      <span className={styles.rowMeta}>
                        {describeProductConfiguration(product, groupsQuery.data ?? [])}
                      </span>
                    </div>
                    <span className={styles.price}>{formatClp(product.priceClp)}</span>
                    <div className={styles.rowActions}>
                      {product.archivedAt === null ? (
                        <>
                          <ButtonLink to={`${copy.basePath}/${product.id}`} variant="secondary">
                            <Pencil size={18} aria-hidden="true" />
                            Editar<span className="visually-hidden"> {product.name}</span>
                          </ButtonLink>
                          <Button
                            variant="ghost"
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
                      )}
                    </div>
                  </Card>
                ))}
              </ul>
            </section>
          ));
        }}
      </AsyncContent>

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
