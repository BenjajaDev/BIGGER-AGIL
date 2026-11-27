import {
  alertRank,
  supplyAlert,
  type MovementInput,
  type Supplier,
  type Supply,
  type SupplyAlert,
} from '@bigger/shared';
import { CircleCheck, Package, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { localToday } from '../../../lib/dates';
import { useArchiveSupply } from '../useInventory';
import { ALERT_LABELS, countByAlert, EMPTY_SUPPLY } from '../supply-text';
import styles from './Inventory.module.css';
import { ALERT_PRESENTATION } from './alert-presentation';
import { SupplyRow } from './SupplyRow';
import { MovementForm, SupplyForm } from './SupplyForms';

type Editing =
  | { kind: 'supply'; supply: Supply }
  | { kind: 'movement'; supply: Supply; movement: MovementInput['kind'] };

const SUMMARY_ORDER: readonly SupplyAlert[] = ['out', 'low', 'expiring', 'expired'];

function SummaryStrip({ supplies, today }: { supplies: readonly Supply[]; today: string }) {
  const counts = countByAlert(supplies, today);
  const needAttention = supplies.length - counts.ok;
  if (supplies.length === 0) return null;
  if (needAttention === 0) {
    return (
      <p role="status" className={styles.strip} data-tone="success">
        <CircleCheck size={20} aria-hidden="true" />
        Todo el stock está en orden.
      </p>
    );
  }
  return (
    <div role="status" className={styles.strip} data-tone="warning">
      <span className={styles.stripMain}>
        <TriangleAlert size={20} aria-hidden="true" />
        {needAttention} {needAttention === 1 ? 'necesita atención' : 'necesitan atención'}
      </span>
      <span className={styles.stripBadges}>
        {SUMMARY_ORDER.filter((alert) => counts[alert] > 0).map((alert) => (
          <StatusBadge
            key={alert}
            tone={ALERT_PRESENTATION[alert].tone}
            icon={ALERT_PRESENTATION[alert].icon}
            label={`${String(counts[alert])} ${ALERT_LABELS[alert].toLowerCase()}`}
          />
        ))}
      </span>
    </div>
  );
}

export function InventoryTab({
  supplies,
  suppliers,
  creating,
  onCreate,
  onCloseCreate,
}: {
  supplies: readonly Supply[];
  suppliers: readonly Supplier[];
  creating: boolean;
  onCreate: () => void;
  onCloseCreate: () => void;
}) {
  const today = localToday();
  const archive = useArchiveSupply();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [toDelete, setToDelete] = useState<Supply | null>(null);
  const rows = supplies
    .map((supply) => ({ supply, alert: supplyAlert(supply, today) }))
    .sort(
      (a, b) =>
        alertRank(a.alert) - alertRank(b.alert) || a.supply.name.localeCompare(b.supply.name, 'es'),
    );
  const close = () => {
    setEditing(null);
    onCloseCreate();
  };
  const open = (next: Editing) => {
    onCloseCreate();
    setEditing(next);
  };

  return (
    <div className={styles.stack}>
      <SummaryStrip supplies={supplies} today={today} />
      {creating && !editing && (
        <SupplyForm
          key="nuevo"
          id={null}
          initial={EMPTY_SUPPLY}
          suppliers={suppliers}
          onDone={close}
        />
      )}
      {editing?.kind === 'supply' && (
        <SupplyForm
          key={editing.supply.id}
          id={editing.supply.id}
          initial={{
            name: editing.supply.name,
            unit: editing.supply.unit,
            minStock: editing.supply.minStock,
            costPerUnitClp: editing.supply.costPerUnitClp,
            supplierId: editing.supply.supplierId,
            expiresOn: editing.supply.expiresOn,
          }}
          suppliers={suppliers}
          onDone={close}
        />
      )}
      {editing?.kind === 'movement' && (
        <MovementForm
          key={`${editing.supply.id}-${editing.movement}`}
          supply={editing.supply}
          kind={editing.movement}
          onDone={close}
        />
      )}
      {rows.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Todavía no hay insumos"
          description="Agrega el primero para controlar el stock."
          action={
            <Button variant="primary" onClick={onCreate}>
              Nuevo insumo
            </Button>
          }
        />
      ) : (
        <ul role="list" className={styles.rows}>
          {rows.map(({ supply, alert }) => (
            <SupplyRow
              key={supply.id}
              supply={supply}
              alert={alert}
              onMovement={(movement) => {
                open({ kind: 'movement', supply, movement });
              }}
              onEdit={() => {
                open({ kind: 'supply', supply });
              }}
              onDelete={() => {
                setToDelete(supply);
              }}
            />
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title={`¿Eliminar ${toDelete?.name ?? 'el insumo'}?`}
        description="Deja de aparecer en el inventario y en la lista de compra."
        confirmLabel="Eliminar"
        isPending={archive.isPending}
        error={archive.error?.message ?? null}
        onClose={() => {
          setToDelete(null);
        }}
        onConfirm={() => {
          if (toDelete)
            archive.mutate(toDelete.id, {
              onSuccess: () => {
                setToDelete(null);
              },
            });
        }}
      />
    </div>
  );
}
