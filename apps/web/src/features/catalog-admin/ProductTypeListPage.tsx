import type { ProductType } from '@bigger/shared';
import { Combine, Package, Pencil, Plus, Shapes, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { pluralize } from '../../lib/format';
import styles from './CatalogAdmin.module.css';
import { FlashNotice } from './components/FlashNotice';
import { PRODUCT_KIND_COPY, PRODUCT_TYPES_PATH } from './form-values';
import { describeProductType } from './product-type-text';
import {
  useAdminModifierGroups,
  useAdminProductTypes,
  useDeleteProductType,
} from './useCatalogAdmin';

export function ProductTypeListPage() {
  const typesQuery = useAdminProductTypes();
  const groupsQuery = useAdminModifierGroups();
  const remove = useDeleteProductType();
  const [pendingDelete, setPendingDelete] = useState<ProductType | null>(null);

  const closeDialog = () => {
    setPendingDelete(null);
    remove.reset();
  };

  return (
    <section className={styles.page} aria-labelledby="lista-titulo">
      <div className={styles.header}>
        <h1 id="lista-titulo" className={styles.title}>
          Tipos de producto
        </h1>
        <div className={styles.headerActions}>
          <ButtonLink to={`${PRODUCT_TYPES_PATH}/nuevo`} variant="primary">
            <Plus size={20} aria-hidden="true" />
            Nuevo tipo
          </ButtonLink>
        </div>
      </div>
      <p className={styles.rowMeta}>
        Plantillas como «Ensalada armable» o «Fajita»: al crear un producto con un tipo, parte con
        sus tamaños, personalizaciones y reglas ya cargados.
      </p>
      <FlashNotice />

      <AsyncContent query={typesQuery} loadingLabel="Cargando tipos…">
        {(types) =>
          types.length === 0 ? (
            <EmptyState icon={Shapes} title="Todavía no hay tipos de producto" />
          ) : (
            <ul role="list" className={styles.rows}>
              {types.map((type) => {
                const copy = PRODUCT_KIND_COPY[type.kind];
                return (
                  <Card as="li" key={type.id} padded={false} className={styles.row}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowTitle}>
                        {type.name}
                        <StatusBadge
                          tone="neutral"
                          icon={type.kind === 'combo' ? Combine : Package}
                          label={type.kind === 'combo' ? 'Combo' : 'Producto'}
                        />
                      </span>
                      <span className={styles.rowMeta}>
                        {describeProductType(type, groupsQuery.data ?? [])} ·{' '}
                        {pluralize(type.productCount, copy.singular, `${copy.singular}s`)}
                      </span>
                    </div>
                    <div className={styles.rowActions}>
                      <ButtonLink to={`${copy.basePath}/nuevo?tipo=${type.id}`} variant="secondary">
                        <Plus size={18} aria-hidden="true" />
                        Crear {copy.singular}
                        <span className="visually-hidden"> de tipo {type.name}</span>
                      </ButtonLink>
                      <ButtonLink to={`${PRODUCT_TYPES_PATH}/${type.id}`} variant="secondary">
                        <Pencil size={18} aria-hidden="true" />
                        Editar<span className="visually-hidden"> {type.name}</span>
                      </ButtonLink>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setPendingDelete(type);
                        }}
                      >
                        <Trash2 size={18} aria-hidden="true" />
                        Eliminar<span className="visually-hidden"> {type.name}</span>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </ul>
          )
        }
      </AsyncContent>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`¿Eliminar «${pendingDelete?.name ?? ''}»?`}
        description="Los productos creados con este tipo no cambian: conservan sus tamaños, reglas y precios."
        confirmLabel="Eliminar"
        isPending={remove.isPending}
        error={remove.error?.message ?? null}
        onClose={closeDialog}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id, { onSuccess: closeDialog });
        }}
      />
    </section>
  );
}
