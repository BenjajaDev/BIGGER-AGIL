import type { Supply } from '@bigger/shared';
import { ArrowLeft, ClipboardList, PackageMinus, PackagePlus } from 'lucide-react';
import { useId, type SyntheticEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { SheetFooter } from '../../../components/ui/Sheet';
import { localToday } from '../../../lib/dates';
import { supplyAlert } from '@bigger/shared';
import { KIND_COPY, type RegisterKind } from '../movement-math';
import { useMovementForm, type MovementInitial, type SavedMovement } from '../useMovementForm';
import { ExpiryPicker } from './ExpiryPicker';
import styles from './Ficha.module.css';
import { FichaHeader } from './FichaHeader';
import { MoreOptions } from './MoreOptions';
import { MovementHistory } from './MovementHistory';
import { QuantityControl } from './QuantityControl';
import { ReasonPicker } from './ReasonPicker';
import { SegmentedRadio, type SegmentOption } from './SegmentedRadio';

const KIND_OPTIONS: readonly SegmentOption<RegisterKind>[] = [
  { value: 'purchase', label: KIND_COPY.purchase.label, icon: PackagePlus },
  { value: 'waste', label: KIND_COPY.waste.label, icon: PackageMinus },
  { value: 'adjustment', label: KIND_COPY.adjustment.label, icon: ClipboardList },
];

/** Everything inside the supply sheet: state, the daily form, history and rare actions. */
export function FichaBody({
  supply,
  initial,
  onSaved,
  onBack,
  onEdit,
  onDeleted,
}: {
  supply: Supply;
  initial: MovementInitial;
  onSaved: (saved: SavedMovement) => void;
  /** Arrival flow: go back to the supply picker. */
  onBack?: () => void;
  onEdit?: () => void;
  onDeleted?: () => void;
}) {
  const today = localToday();
  const formId = useId();
  const form = useMovementForm(supply, initial, onSaved);
  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    form.submit();
  };

  return (
    <>
      {onBack && (
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          Cambiar insumo
        </Button>
      )}
      <FichaHeader supply={supply} alert={supplyAlert(supply, today)} today={today} />
      <form id={formId} className={styles.form} onSubmit={submit} noValidate>
        <SegmentedRadio
          label="¿Qué pasó?"
          name={`${formId}-kind`}
          options={KIND_OPTIONS}
          value={form.kind}
          onChange={form.setKind}
          tall
        />
        <QuantityControl
          supply={supply}
          kind={form.kind}
          text={form.text}
          error={form.error}
          preview={form.preview}
          onChange={form.setText}
          onStep={form.step}
          onAdd={form.add}
        />
        {form.kind === 'purchase' && (
          <ExpiryPicker
            choice={form.expiry}
            date={form.customDate}
            resolved={form.expiresOn}
            error={form.expiryError}
            onChoice={form.setExpiry}
            onDate={form.setCustomDate}
          />
        )}
        {form.kind === 'waste' && (
          <ReasonPicker
            reason={form.reason}
            detail={form.detail}
            onReason={form.setReason}
            onDetail={form.setDetail}
          />
        )}
        {form.serverError && (
          <p role="alert" className={styles.error}>
            {form.serverError}
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
          disabled={form.pending}
        >
          {form.pending ? 'Guardando…' : form.label}
        </Button>
      </SheetFooter>
      <MovementHistory supply={supply} />
      {onEdit && onDeleted && <MoreOptions supply={supply} onEdit={onEdit} onDeleted={onDeleted} />}
    </>
  );
}
