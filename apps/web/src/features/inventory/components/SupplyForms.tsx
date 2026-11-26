import {
  SUPPLY_UNITS,
  UNIT_LABELS,
  type MovementInput,
  type Supplier,
  type Supply,
  type SupplyInput,
} from '@bigger/shared';
import { useState } from 'react';
import { Field } from '../../../components/form/Field';
import { MoneyInput } from '../../../components/form/MoneyInput';
import { controlClassName } from '../../../components/form/control';
import { useRegisterMovement, useSaveSupply } from '../useInventory';
import { FormCard } from './FormCard';
import styles from './Inventory.module.css';

export function SupplyForm({
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
    <FormCard
      title={id ? 'Editar insumo' : 'Nuevo insumo'}
      submitLabel={id ? 'Guardar cambios' : 'Agregar insumo'}
      pending={save.isPending}
      error={save.error?.message ?? null}
      onCancel={onDone}
      onSubmit={() => {
        save.mutate({ id, input: form }, { onSuccess: onDone });
      }}
    >
      <Field label="Nombre" className={styles.wide}>
        {(control) => (
          <input
            {...control}
            className={controlClassName}
            required
            value={form.name}
            onChange={(e) => {
              set('name', e.target.value);
            }}
          />
        )}
      </Field>
      <Field label="Unidad">
        {(control) => (
          <select
            {...control}
            className={controlClassName}
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
        )}
      </Field>
      <Field label="Stock mínimo" hint="Bajo este nivel aparece en la lista de compra.">
        {(control) => (
          <input
            {...control}
            className={controlClassName}
            type="number"
            min={0}
            step="any"
            value={form.minStock}
            onChange={(e) => {
              set('minStock', Number(e.target.value));
            }}
          />
        )}
      </Field>
      <Field label="Costo por unidad">
        {(control) => (
          <MoneyInput
            {...control}
            value={form.costPerUnitClp}
            onChange={(e) => {
              set('costPerUnitClp', Math.round(Number(e.target.value)));
            }}
          />
        )}
      </Field>
      <Field label="Proveedor">
        {(control) => (
          <select
            {...control}
            className={controlClassName}
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
        )}
      </Field>
      <Field label="Vence (opcional)">
        {(control) => (
          <input
            {...control}
            className={controlClassName}
            type="date"
            value={form.expiresOn ?? ''}
            onChange={(e) => {
              set('expiresOn', e.target.value === '' ? null : e.target.value);
            }}
          />
        )}
      </Field>
    </FormCard>
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

export function MovementForm({
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
    <FormCard
      title={`${copy.title}: ${supply.name}`}
      submitLabel={copy.button}
      pending={register.isPending}
      submitDisabled={quantity === ''}
      error={register.error?.message ?? null}
      onCancel={onDone}
      onSubmit={() => {
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
      <Field label={`${copy.quantity} (${UNIT_LABELS[supply.unit]})`}>
        {(control) => (
          <input
            {...control}
            className={controlClassName}
            type="number"
            required
            min={0}
            step="any"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
            }}
          />
        )}
      </Field>
      {kind === 'purchase' && (
        <Field label="Nueva fecha de vencimiento (opcional)">
          {(control) => (
            <input
              {...control}
              className={controlClassName}
              type="date"
              value={expiresOn}
              onChange={(e) => {
                setExpiresOn(e.target.value);
              }}
            />
          )}
        </Field>
      )}
      <Field label="Nota (opcional)" className={styles.wide}>
        {(control) => (
          <input
            {...control}
            className={controlClassName}
            maxLength={120}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
            }}
          />
        )}
      </Field>
    </FormCard>
  );
}
