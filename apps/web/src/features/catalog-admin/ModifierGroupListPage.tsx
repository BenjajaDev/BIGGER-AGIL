import type { AdminModifierGroup } from '@bigger/shared';
import { Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { pluralize } from '../../lib/format';
import styles from './CatalogAdmin.module.css';
import { FlashNotice } from './components/FlashNotice';
import { deleteGroupWarning, describeOptions } from './modifier-group-text';
import { describeSelectionRule } from './selection-rule';
import { useAdminModifierGroups, useDeleteModifierGroup } from './useCatalogAdmin';

const BASE_PATH = '/configuracion/personalizaciones';

export function ModifierGroupListPage() {
  const groupsQuery = useAdminModifierGroups();
  const remove = useDeleteModifierGroup();
  const [pendingDelete, setPendingDelete] = useState<AdminModifierGroup | null>(null);

  const closeDialog = () => {
    setPendingDelete(null);
    remove.reset();
  };

  return (
    <section className={styles.page} aria-labelledby="lista-titulo">
      <div className={styles.header}>
        <h1 id="lista-titulo" className={styles.title}>
          Personalizaciones
        </h1>
        <div className={styles.headerActions}>
          <ButtonLink to={`${BASE_PATH}/nueva`} variant="primary">
            <Plus size={20} aria-hidden="true" />
            Nueva personalización
          </ButtonLink>
        </div>
      </div>
      <p className={styles.rowMeta}>
        Grupos reutilizables como «Tipo de leche» o «Tamaño». Se crean una vez y se asignan a todos
        los productos que los ofrecen.
      </p>
      <FlashNotice />

      <AsyncContent query={groupsQuery} loadingLabel="Cargando personalizaciones…">
        {(groups) =>
          groups.length === 0 ? (
            <EmptyState icon={SlidersHorizontal} title="Todavía no hay personalizaciones" />
          ) : (
            <ul role="list" className={styles.rows}>
              {groups.map((group) => (
                <Card as="li" key={group.id} padded={false} className={styles.row}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>{group.name}</span>
                    <span className={styles.rowMeta}>
                      {describeSelectionRule(group.minSelections, group.maxSelections)} ·{' '}
                      {pluralize(group.productCount, 'producto', 'productos')}
                    </span>
                    <span className={styles.rowMeta}>{describeOptions(group)}</span>
                  </div>
                  <div className={styles.rowActions}>
                    <ButtonLink to={`${BASE_PATH}/${group.id}`} variant="secondary">
                      <Pencil size={18} aria-hidden="true" />
                      Editar<span className="visually-hidden"> {group.name}</span>
                    </ButtonLink>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setPendingDelete(group);
                      }}
                    >
                      <Trash2 size={18} aria-hidden="true" />
                      Eliminar<span className="visually-hidden"> {group.name}</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </ul>
          )
        }
      </AsyncContent>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`¿Eliminar «${pendingDelete?.name ?? ''}»?`}
        description={pendingDelete ? deleteGroupWarning(pendingDelete) : ''}
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
