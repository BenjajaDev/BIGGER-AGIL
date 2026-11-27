import { UNIT_LABELS, type Supplier, type Supply, type SupplyUnit } from '@bigger/shared';
import { useId } from 'react';
import { Field } from '../../../components/form/Field';
import { MoneyInput } from '../../../components/form/MoneyInput';
import { controlClassName } from '../../../components/form/control';
import { Button } from '../../../components/ui/Button';
import { Sheet, SheetFooter } from '../../../components/ui/Sheet';
import { useSupplyForm } from '../useSupplyForm';
import { SegmentedRadio, type SegmentOption } from './SegmentedRadio';
import styles from './SupplyForm.module.css';
import { UnitInput } from './UnitInput';

const UNIT_OPTIONS: readonly SegmentOption<SupplyUnit>[] = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'l', label: 'L' },
  { value: 'ml', label: 'ml' },
  { value: 'un', label: 'unidades' },
];

function SupplyFormBody({
  supply,
  suppliers,
  onDone,
}: {
  supply: Supply | null;
  suppliers: readonly Supplier[];
  onDone: () => void;
}) {
  const formId = useId();
  const f = useSupplyForm(supply, onDone);
  const unitLabel = UNIT_LABELS[f.unit];

  return (
    <>
      <form id={formId} className={styles.form} onSubmit={f.submit} noValidate>
        <Field label="Nombre" error={f.shown ? f.errors.name : undefined}>
          {(control) => (
            <input
              {...control}
              className={controlClassName}
              autoComplete="off"
              value={f.name}
              onChange={(event) => {
                f.setName(event.target.value);
              }}
            />
          )}
        </Field>
        <div>
          <p className={styles.unitTitle} aria-hidden="true">
            Unidad
          </p>
          <SegmentedRadio
            label="Unidad"
            name={`${formId}-unit`}
            options={UNIT_OPTIONS}
            value={f.unit}
            onChange={f.setUnit}
            template="repeat(4, minmax(0, 1fr)) minmax(0, 2.2fr)"
          />
        </div>
        <div className={styles.pair}>
          <Field
            label="Stock mínimo"
            hint="Bajo este nivel pasa a «Por comprar»."
            error={f.shown ? f.errors.min : undefined}
          >
            {(control) => (
              <UnitInput
                {...control}
                unit={unitLabel}
                value={f.minStock}
                placeholder="0"
                onChange={(event) => {
                  f.setMinStock(event.target.value);
                }}
              />
            )}
          </Field>
          <Field label="Costo por unidad">
            {(control) => (
              <MoneyInput
                {...control}
                value={f.cost}
                placeholder="0"
                onChange={(event) => {
                  f.setCost(event.target.value);
                }}
              />
            )}
          </Field>
        </div>
        <Field label="Proveedor">
          {(control) => (
            <select
              {...control}
              className={controlClassName}
              value={f.supplierId}
              onChange={(event) => {
                f.setSupplierId(event.target.value);
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
              type="date"
              className={controlClassName}
              value={f.expiresOn}
              onChange={(event) => {
                f.setExpiresOn(event.target.value);
              }}
            />
          )}
        </Field>
        {!supply && (
          <Field
            label="Stock inicial (opcional)"
            hint="Cuánto hay hoy en bodega."
            error={f.shown ? f.errors.stock : undefined}
          >
            {(control) => (
              <UnitInput
                {...control}
                unit={unitLabel}
                value={f.initialStock}
                placeholder="0"
                onChange={(event) => {
                  f.setInitialStock(event.target.value);
                }}
              />
            )}
          </Field>
        )}
        {f.failure && (
          <p role="alert" className={styles.error}>
            {f.failure}
          </p>
        )}
      </form>
      <SheetFooter>
        <Button
          type="submit"
          form={formId}
          variant="primary"
          size="lg"
          fullWidth
          disabled={f.pending}
        >
          {f.pending ? 'Guardando…' : supply ? 'Guardar cambios' : 'Agregar insumo'}
        </Button>
      </SheetFooter>
    </>
  );
}

/** Create or edit a supply in a panel; on create, an optional first count of the stock. */
export function SupplyFormSheet({
  open,
  supply,
  suppliers,
  onClose,
}: {
  open: boolean;
  supply: Supply | null;
  suppliers: readonly Supplier[];
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={supply ? 'Editar insumo' : 'Nuevo insumo'}>
      {open && (
        <SupplyFormBody
          key={supply?.id ?? 'nuevo'}
          supply={supply}
          suppliers={suppliers}
          onDone={onClose}
        />
      )}
    </Sheet>
  );
}
