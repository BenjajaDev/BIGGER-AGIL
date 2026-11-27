import type { Supply } from '@bigger/shared';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { useArchiveSupply } from '../useInventory';
import styles from './Ficha.module.css';

/** Occasional actions live behind a disclosure so they never compete with the daily ones. */
export function MoreOptions({
  supply,
  onEdit,
  onDeleted,
}: {
  supply: Supply;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const archive = useArchiveSupply();
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <details className={styles.more}>
        <summary className={styles.moreSummary}>
          Más opciones
          <ChevronDown className={styles.chevron} size={20} aria-hidden="true" />
        </summary>
        <div className={styles.moreActions}>
          <Button variant="secondary" onClick={onEdit}>
            <Pencil size={18} aria-hidden="true" />
            Editar insumo
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirming(true);
            }}
          >
            <Trash2 size={18} aria-hidden="true" />
            Eliminar
          </Button>
        </div>
      </details>
      <ConfirmDialog
        open={confirming}
        title={`¿Eliminar ${supply.name}?`}
        description="Deja de aparecer en el inventario y en la lista de compra."
        confirmLabel="Eliminar"
        isPending={archive.isPending}
        error={archive.error?.message ?? null}
        onClose={() => {
          setConfirming(false);
        }}
        onConfirm={() => {
          archive.mutate(supply.id, { onSuccess: onDeleted });
        }}
      />
    </>
  );
}
