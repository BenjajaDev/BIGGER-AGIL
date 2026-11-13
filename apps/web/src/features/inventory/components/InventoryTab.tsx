import {
  alertRank,
  supplyAlert,
  SUPPLY_UNITS,
  UNIT_LABELS,
  type MovementInput,
  type Supplier,
  type Supply,
  type SupplyAlert,
  type SupplyInput,
} from '@bigger/shared';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { StatusBadge, type StatusTone } from '../../../components/ui/StatusBadge';
import { localToday } from '../../../lib/dates';
import { CircleAlert, CircleCheck, CircleSlash, Hourglass, TriangleAlert } from 'lucide-react';
import { useArchiveSupply, useRegisterMovement, useSaveSupply } from '../useInventory';
import { ALERT_LABELS, formatQuantity } from '../supply-text';
import styles from './Inventory.module.css';

const ALERT_PRESENTATION = {
  ok: { tone: 'success', icon: CircleCheck },
  low: { tone: 'warning', icon: TriangleAlert },
  out: { tone: 'accent', icon: CircleSlash },
  expiring: { tone: 'warning', icon: Hourglass },
  expired: { tone: 'accent', icon: CircleAlert },
} as const satisfies Record<SupplyAlert, { tone: StatusTone; icon: typeof CircleCheck }>;

const EMPTY_SUPPLY: SupplyInput = {
  name: '',
  unit: 'un',
  minStock: 0,
  costPerUnitClp: 0,
  supplierId: null,
  expiresOn: null,
};

type Editing =
  | { kind: 'supply'; supply: Supply | null }
  | { kind: 'movement'; supply: Supply; movement: MovementInput['kind'] };

function SupplyForm({
  initial,
  id,
  suppliers,
  onDone,
}: {
  initial: SupplyInput;
  id: string | null;
  suppliers: readonly Supplier[];
  onDone: () => void;
}) {
  const save = useSaveSupply();
  const [form, setForm] = useState(initial);
  const set = <K extends keyof SupplyInput>(key: K, value: SupplyInput[K]) => {
    setForm({ ...form, [key]: value });
  };
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({ id, input: form }, { onSuccess: onDone });
      }}
    >
      <div className={styles.field}>
        <label htmlFor="insumo-nombre">Nombre</label>
        <input
          id="insumo-nombre"
          required
          value={form.name}
          onChange={(e) => {
            set('name', e.target.value);
          }}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="insumo-unidad">Unidad</label>
        <select
          id="insumo-unidad"
          value={form.unit}
          onChange={(e) => {
            set('unit', e.target.value as SupplyInput['unit']);
          }}
        >
          {SUPPLY_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {UNIT_LABELS[unit]}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor="insumo-minimo">Stock mínimo</label>
        <input
          id="insumo-minimo"
          type="number"
          min={0}
          step="any"
          value={form.minStock}
          onChange={(e) => {
            set('minStock', Number(e.target.value));
          }}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="insumo-costo">Costo por unidad ($)</label>
        <input
          id="insumo-costo"
          type="number"
          min={0}
          step={1}
          value={form.costPerUnitClp}
          onChange={(e) => {
            set('costPerUnitClp', Math.round(Number(e.target.value)));
          }}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="insumo-proveedor">Proveedor</label>
        <select
          id="insumo-proveedor"
          value={form.supplierId ?? ''}
          onChange={(e) => {
            set('supplierId', e.target.value === '' ? null : e.target.value);
          }}
        >
          <option value="">Sin proveedor</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor="insumo-vence">Vence (opcional)</label>
        <input
          id="insumo-vence"
          type="date"
          value={form.expiresOn ?? ''}
          onChange={(e) => {
            set('expiresOn', e.target.value === '' ? null : e.target.value);
          }}
        />
      </div>
      {save.error && (
        <p role="alert" className={styles.error}>
          {save.error.message}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" variant="primary" disabled={save.isPending}>
          {id ? 'Guardar cambios' : 'Agregar insumo'}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

const MOVEMENT_COPY = {
  purchase: {
    title: 'Registrar entrada',
    quantity: 'Cantidad recibida',
    button: 'Registrar entrada',
  },
  waste: { title: 'Registrar merma', quantity: 'Cantidad perdida', button: 'Registrar merma' },
  adjustment: { title: 'Contar el stock', quantity: 'Stock contado', button: 'Guardar conteo' },
} as const;

function MovementForm({
  supply,
  kind,
  onDone,
}: {
  supply: Supply;
  kind: MovementInput['kind'];
  onDone: () => void;
}) {
  const register = useRegisterMovement();
  const [quantity, setQuantity] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [note, setNote] = useState('');
  const copy = MOVEMENT_COPY[kind];
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        register.mutate(
          {
            id: supply.id,
            input: {
              kind,
              quantity: Number(quantity),
              expiresOn: expiresOn === '' ? null : expiresOn,
              note,
            },
          },
          { onSuccess: onDone },
        );
      }}
    >
      <h3 className={styles.formTitle}>
        {copy.title}: {supply.name}
      </h3>
      <div className={styles.field}>
        <label htmlFor="mov-cantidad">
          {copy.quantity} ({UNIT_LABELS[supply.unit]})
        </label>
        <input
          id="mov-cantidad"
          type="number"
          required
          min={0}
          step="any"
          value={quantity}
          onChange={(e) => {
            setQuantity(e.target.value);
          }}
        />
      </div>
      {kind === 'purchase' && (
        <div className={styles.field}>
          <label htmlFor="mov-vence">Nueva fecha de vencimiento (opcional)</label>
          <input
            id="mov-vence"
            type="date"
            value={expiresOn}
            onChange={(e) => {
              setExpiresOn(e.target.value);
            }}
          />
        </div>
      )}
      <div className={styles.field}>
        <label htmlFor="mov-nota">Nota (opcional)</label>
        <input
          id="mov-nota"
          maxLength={120}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
          }}
        />
      </div>
      {register.error && (
        <p role="alert" className={styles.error}>
          {register.error.message}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" variant="primary" disabled={quantity === '' || register.isPending}>
          {copy.button}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function InventoryTab({
  supplies,
  suppliers,
}: {
  supplies: readonly Supply[];
  suppliers: readonly Supplier[];
}) {
  const today = localToday();
  const archive = useArchiveSupply();
  const [editing, setEditing] = useState<Editing | null>(null);
  const rows = supplies
    .map((supply) => ({ supply, alert: supplyAlert(supply, today) }))
    .sort(
      (a, b) =>
        alertRank(a.alert) - alertRank(b.alert) || a.supply.name.localeCompare(b.supply.name, 'es'),
    );
  const needAttention = rows.filter((row) => row.alert !== 'ok').length;
  const close = () => {
    setEditing(null);
  };

  return (
    <div className={styles.stack}>
      <p role="status" className={needAttention > 0 ? styles.attention : styles.fine}>
        {needAttention > 0
          ? `${String(needAttention)} insumo${needAttention === 1 ? '' : 's'} necesita${needAttention === 1 ? '' : 'n'} atención.`
          : 'Todo el stock está en orden.'}
      </p>
      <div className={styles.actions}>
        <Button
          variant="primary"
          onClick={() => {
            setEditing({ kind: 'supply', supply: null });
          }}
        >
          Nuevo insumo
        </Button>
      </div>
      {editing?.kind === 'supply' && (
        <Card>
          <SupplyForm
            key={editing.supply?.id ?? 'nuevo'}
            id={editing.supply?.id ?? null}
            initial={
              editing.supply
                ? {
                    name: editing.supply.name,
                    unit: editing.supply.unit,
                    minStock: editing.supply.minStock,
                    costPerUnitClp: editing.supply.costPerUnitClp,
                    supplierId: editing.supply.supplierId,
                    expiresOn: editing.supply.expiresOn,
                  }
                : EMPTY_SUPPLY
            }
            suppliers={suppliers}
            onDone={close}
          />
        </Card>
      )}
      {editing?.kind === 'movement' && (
        <Card>
          <MovementForm supply={editing.supply} kind={editing.movement} onDone={close} />
        </Card>
      )}
      {rows.length === 0 ? (
        <p className={styles.empty}>
          Todavía no hay insumos. Agrega el primero para controlar el stock.
        </p>
      ) : (
        <ul role="list" className={styles.rows}>
          {rows.map(({ supply, alert }) => {
            const { tone, icon } = ALERT_PRESENTATION[alert];
            return (
              <Card as="li" key={supply.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>
                    {supply.name}
                    <StatusBadge tone={tone} icon={icon} label={ALERT_LABELS[alert]} />
                  </span>
                  <span className={styles.rowMeta}>
                    Stock {formatQuantity(supply.stock, supply.unit)} · mínimo{' '}
                    {formatQuantity(supply.minStock, supply.unit)}
                    {supply.expiresOn && ` · vence ${supply.expiresOn}`}
                    {supply.supplierName && ` · ${supply.supplierName}`}
                  </span>
                </div>
                <div className={styles.actions}>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditing({ kind: 'movement', supply, movement: 'purchase' });
                    }}
                  >
                    Entrada<span className="visually-hidden"> de {supply.name}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditing({ kind: 'movement', supply, movement: 'waste' });
                    }}
                  >
                    Merma<span className="visually-hidden"> de {supply.name}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditing({ kind: 'movement', supply, movement: 'adjustment' });
                    }}
                  >
                    Contar<span className="visually-hidden"> {supply.name}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditing({ kind: 'supply', supply });
                    }}
                  >
                    Editar<span className="visually-hidden"> {supply.name}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={archive.isPending}
                    onClick={() => {
                      archive.mutate(supply.id);
                    }}
                  >
                    Eliminar<span className="visually-hidden"> {supply.name}</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
