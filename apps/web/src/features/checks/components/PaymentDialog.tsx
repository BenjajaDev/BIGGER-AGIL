import type { Check } from '@bigger/shared';
import { CircleCheck, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { FieldError } from '../../../components/form/Field';
import { Button } from '../../../components/ui/Button';
import { formatClp } from '../../../lib/format';
import {
  INITIAL_PAYMENT_DRAFT,
  paymentBlocker,
  paymentTotals,
  toPaymentInput,
  type PaymentDraft,
} from '../payment-draft';
import { PAYMENT_METHOD_PRESENTATION } from '../payment-presentation';
import { usePay, useSetSplit } from '../useChecks';
import styles from './PaymentDialog.module.css';
import {
  CashField,
  ItemPicker,
  MethodPicker,
  ModePicker,
  SplitPicker,
  TipField,
} from './PaymentSections';

export interface PaymentDialogProps {
  check: Check;
  open: boolean;
  onClose: () => void;
}

interface PaymentResult {
  check: Check;
  changeClp: number | null;
  totalClp: number;
}

/**
 * Native modal `<dialog>`: focus trap, inert background and Esc come from the browser. The
 * draft only holds choices; every amount is recalculated from the live check.
 */
export function PaymentDialog({ check, open, onClose }: PaymentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const title = check.tableLabel ? `Cobrar ${check.tableLabel}` : 'Cobrar pedido';

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} onClose={onClose}>
      <div className={styles.head}>
        <div>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <p className={styles.balance}>Saldo {formatClp(check.balanceClp)}</p>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
          <X size={22} aria-hidden="true" />
        </button>
      </div>
      {open && <PaymentForm check={check} onClose={onClose} />}
    </dialog>
  );
}

function PaymentForm({ check, onClose }: { check: Check; onClose: () => void }) {
  const pay = usePay();
  const split = useSetSplit();
  const [draft, setDraft] = useState<PaymentDraft>(INITIAL_PAYMENT_DRAFT);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const update = (change: Partial<PaymentDraft>) => {
    setDraft((current) => ({ ...current, ...change }));
  };

  if (result) {
    return (
      <PaymentDone
        result={result}
        onAnother={() => {
          setResult(null);
          setDraft(INITIAL_PAYMENT_DRAFT);
          pay.reset();
        }}
        onClose={onClose}
      />
    );
  }

  const totals = paymentTotals(check, draft);
  const blocker = paymentBlocker(check, draft);
  const error = pay.error?.message ?? split.error?.message ?? null;

  const submit = () => {
    pay.mutate(
      { checkId: check.id, input: toPaymentInput(check, draft) },
      {
        onSuccess: (updated) => {
          setResult({ check: updated, changeClp: totals.changeClp, totalClp: totals.dueClp });
        },
      },
    );
  };

  return (
    <>
      <div className={styles.body}>
        <ModePicker
          value={draft.mode}
          onChange={(mode) => {
            update({ mode });
          }}
        />
        {draft.mode === 'items' && (
          <ItemPicker
            check={check}
            units={draft.units}
            onChange={(units) => {
              update({ units });
            }}
          />
        )}
        {draft.mode === 'equal' && (
          <SplitPicker
            check={check}
            isPending={split.isPending}
            onSplit={(parts) => {
              split.mutate({ checkId: check.id, parts });
            }}
          />
        )}
        <MethodPicker
          value={draft.method}
          onChange={(method) => {
            update({ method });
          }}
        />
        <TipField
          method={draft.method}
          enabled={draft.tipEnabled}
          tipClp={totals.tipClp}
          onToggle={(tipEnabled) => {
            update({ tipEnabled, customTipClp: null });
          }}
          onChange={(customTipClp) => {
            update({ customTipClp });
          }}
        />
        {draft.method === 'cash' && (
          <CashField
            dueClp={totals.dueClp}
            receivedClp={draft.receivedClp}
            changeClp={totals.changeClp}
            onChange={(receivedClp) => {
              update({ receivedClp });
            }}
          />
        )}
      </div>

      <div className={styles.footer}>
        <dl className={styles.totals}>
          <div>
            <dt>Consumo</dt>
            <dd>{formatClp(totals.amountClp)}</dd>
          </div>
          <div>
            <dt>Propina</dt>
            <dd>{formatClp(totals.tipClp)}</dd>
          </div>
          <div className={styles.due}>
            <dt>Total a cobrar</dt>
            <dd>{formatClp(totals.dueClp)}</dd>
          </div>
          {totals.changeClp !== null && (
            <div className={styles.due}>
              <dt>Vuelto</dt>
              <dd>{formatClp(totals.changeClp)}</dd>
            </div>
          )}
        </dl>
        {error && (
          <div role="alert">
            <FieldError message={error} />
          </div>
        )}
        <p className={styles.blocker} role="status">
          {blocker ?? ''}
        </p>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={blocker !== null || pay.isPending}
          onClick={submit}
        >
          {pay.isPending
            ? 'Cobrando…'
            : `Cobrar ${formatClp(totals.dueClp)}${draft.method ? ` con ${PAYMENT_METHOD_PRESENTATION[draft.method].label}` : ''}`}
        </Button>
      </div>
    </>
  );
}

interface PaymentDoneProps {
  result: PaymentResult;
  onAnother: () => void;
  onClose: () => void;
}

function PaymentDone({ result, onAnother, onClose }: PaymentDoneProps) {
  const { check, changeClp, totalClp } = result;
  const closed = check.status === 'closed';
  return (
    <div className={styles.done} role="status">
      <CircleCheck className={styles.doneIcon} size={48} aria-hidden="true" />
      <p className={styles.doneTitle}>Pago registrado: {formatClp(totalClp)}</p>
      {changeClp !== null && (
        <p className={styles.doneChange}>
          Vuelto <strong>{formatClp(changeClp)}</strong>
        </p>
      )}
      <p className={styles.muted}>
        {closed
          ? 'La cuenta quedó pagada y la mesa está libre.'
          : check.balanceClp === 0
            ? 'Cuenta pagada: la mesa se libera cuando se entregue todo.'
            : `Queda un saldo de ${formatClp(check.balanceClp)}.`}
      </p>
      <div className={styles.doneActions}>
        {check.balanceClp > 0 && (
          <Button variant="secondary" onClick={onAnother}>
            Cobrar otra parte
          </Button>
        )}
        {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the dialog's next step after paying */}
        <Button variant="primary" onClick={onClose} autoFocus>
          Listo
        </Button>
      </div>
    </div>
  );
}
