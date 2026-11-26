import type { Supply, SupplyAlert } from '@bigger/shared';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ALERT_PRESENTATION } from './alert-presentation';
import { ALERT_LABELS, formatExpiry, formatQuantity } from '../supply-text';
import styles from './Inventory.module.css';
import { StockMeter } from './StockMeter';

export type MovementKind = 'purchase' | 'waste' | 'adjustment';

export interface SupplyRowProps {
  supply: Supply;
  alert: SupplyAlert;
  onMovement: (kind: MovementKind) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SupplyRow({ supply, alert, onMovement, onEdit, onDelete }: SupplyRowProps) {
  const { tone, icon } = ALERT_PRESENTATION[alert];
  return (
    <Card as="li" className={styles.supplyRow}>
      <div className={styles.rowMain}>
        <span className={styles.rowTitle}>
          {supply.name}
          <StatusBadge tone={tone} icon={icon} label={ALERT_LABELS[alert]} />
        </span>
        <span className={styles.rowMeta}>
          Stock {formatQuantity(supply.stock, supply.unit)} · mínimo{' '}
          {formatQuantity(supply.minStock, supply.unit)}
          {supply.expiresOn && ` · vence ${formatExpiry(supply.expiresOn)}`}
          {supply.supplierName && ` · ${supply.supplierName}`}
        </span>
        <StockMeter stock={supply.stock} minStock={supply.minStock} alert={alert} />
      </div>
      <div className={styles.quick}>
        <Button
          variant="secondary"
          onClick={() => {
            onMovement('purchase');
          }}
        >
          Entrada<span className="visually-hidden"> de {supply.name}</span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            onMovement('waste');
          }}
        >
          Merma<span className="visually-hidden"> de {supply.name}</span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            onMovement('adjustment');
          }}
        >
          Contar<span className="visually-hidden"> {supply.name}</span>
        </Button>
      </div>
      <div className={styles.manage}>
        <Button
          variant="secondary"
          iconOnly
          aria-label={`Editar ${supply.name}`}
          title="Editar"
          onClick={onEdit}
        >
          <Pencil size={18} aria-hidden="true" />
        </Button>
        <Button
          variant="danger"
          iconOnly
          aria-label={`Eliminar ${supply.name}`}
          title="Eliminar"
          onClick={onDelete}
        >
          <Trash2 size={18} aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
}
