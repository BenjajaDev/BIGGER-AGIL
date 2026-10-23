import type { Payment } from '@bigger/shared';
import { useId, useState } from 'react';
import { controlClassName } from '../../../components/form/control';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { formatClp } from '../../../lib/format';
import { PAYMENT_METHOD_PRESENTATION } from '../payment-presentation';
import { useVoidPayment } from '../useChecks';

const MIN_REASON = 3;

export interface VoidPaymentDialogProps {
  payment: Payment | null;
  onClose: () => void;
}

/** A voided payment stays in the history with its reason; the balance goes back up. */
export function VoidPaymentDialog({ payment, onClose }: VoidPaymentDialogProps) {
  const voidPayment = useVoidPayment();
  const [reason, setReason] = useState('');
  const reasonId = useId();

  const close = () => {
    setReason('');
    voidPayment.reset();
    onClose();
  };

  const method = payment ? PAYMENT_METHOD_PRESENTATION[payment.method].label : '';
  return (
    <ConfirmDialog
      open={payment !== null}
      title="¿Anular este pago?"
      description={
        payment
          ? `${method} por ${formatClp(payment.amountClp + payment.tipClp)}. El saldo de la cuenta vuelve a subir; el pago queda en el historial como anulado.`
          : ''
      }
      confirmLabel="Anular pago"
      isPending={voidPayment.isPending}
      confirmDisabled={reason.trim().length < MIN_REASON}
      error={voidPayment.error?.message ?? null}
      onClose={close}
      onConfirm={() => {
        if (payment) voidPayment.mutate({ paymentId: payment.id, reason }, { onSuccess: close });
      }}
    >
      <label htmlFor={reasonId}>Motivo</label>
      <input
        id={reasonId}
        className={controlClassName}
        value={reason}
        maxLength={140}
        placeholder="Ej.: se pasó la tarjeta equivocada"
        onChange={(event) => {
          setReason(event.target.value);
        }}
      />
    </ConfirmDialog>
  );
}
