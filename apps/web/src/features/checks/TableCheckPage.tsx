import type { Check, Payment } from '@bigger/shared';
import { ArrowLeft, CircleCheck, Plus, ReceiptText, Undo2, UtensilsCrossed } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { RouteFallback } from '../../app/RouteFallback';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ApiRequestError } from '../../services/http-client';
import { formatClockTime, formatClp } from '../../lib/format';
import { ORDER_STATUS_PRESENTATION } from '../orders/order-status';
import { describeOrderItem } from '../orders/order-text';
import { PaymentDialog } from './components/PaymentDialog';
import { VoidPaymentDialog } from './components/VoidPaymentDialog';
import {
  orderLabel,
  PAYMENT_METHOD_PRESENTATION,
  PAYMENT_MODE_LABEL,
} from './payment-presentation';
import styles from './TableCheckPage.module.css';
import { useTableCheck } from './useChecks';

function BackToTables() {
  return (
    <ButtonLink to="/mesas" variant="ghost">
      <ArrowLeft size={18} aria-hidden="true" />
      Mesas
    </ButtonLink>
  );
}

function CheckSummary({ check }: { check: Check }) {
  return (
    <dl className={styles.summary}>
      <div>
        <dt>Total</dt>
        <dd>{formatClp(check.totalClp)}</dd>
      </div>
      <div>
        <dt>Pagado</dt>
        <dd>{formatClp(check.paidClp)}</dd>
      </div>
      {check.tipClp > 0 && (
        <div>
          <dt>Propinas</dt>
          <dd>{formatClp(check.tipClp)}</dd>
        </div>
      )}
      <div className={styles.balance}>
        <dt>Saldo</dt>
        <dd>{formatClp(check.balanceClp)}</dd>
      </div>
      {check.splitParts !== null && check.remainingParts !== null && (
        <p className={styles.split}>
          Dividida en {check.splitParts} partes · faltan {check.remainingParts}
        </p>
      )}
    </dl>
  );
}

function OrdersList({ check }: { check: Check }) {
  return (
    <ul role="list" className={styles.orders}>
      {check.orders.map((order, index) => {
        const status = ORDER_STATUS_PRESENTATION[order.status];
        const cancelled = order.status === 'cancelled';
        return (
          <Card as="li" key={order.id} className={styles.order}>
            <div className={styles.orderHead}>
              <h3 className={styles.orderTitle}>{orderLabel(order, index)}</h3>
              <span className={styles.muted}>{formatClockTime(order.createdAt)}</span>
              <StatusBadge tone={status.tone} icon={status.icon} label={status.label} />
            </div>
            <ul role="list" className={styles.lines}>
              {order.items.map((item) => {
                const line = check.lines.find((candidate) => candidate.orderItemId === item.id);
                const paid = line?.paidQuantity ?? 0;
                return (
                  <li key={item.id} className={cancelled ? styles.cancelled : styles.line}>
                    <span>{describeOrderItem(item)}</span>
                    <span className={styles.lineMeta}>
                      {paid > 0 && (
                        <StatusBadge
                          tone="success"
                          icon={CircleCheck}
                          label={paid === item.quantity ? 'Pagado' : `${paid} pagado`}
                        />
                      )}
                      <span className={styles.amount}>
                        {formatClp((line?.unitTotalClp ?? item.unitPriceClp) * item.quantity)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </ul>
  );
}

function PaymentsList({
  payments,
  onVoid,
}: {
  payments: Payment[];
  onVoid: (payment: Payment) => void;
}) {
  if (payments.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="pagos-titulo">
      <h2 id="pagos-titulo" className={styles.sectionTitle}>
        Pagos
      </h2>
      <ul role="list" className={styles.payments}>
        {payments.map((payment) => {
          const { label, icon: Icon } = PAYMENT_METHOD_PRESENTATION[payment.method];
          const voided = payment.voidedAt !== null;
          return (
            <li key={payment.id} className={voided ? styles.voided : styles.payment}>
              <Icon size={22} aria-hidden="true" />
              <span className={styles.paymentMain}>
                <span className={styles.paymentTitle}>
                  {label} · {PAYMENT_MODE_LABEL[payment.mode]}
                  {voided && ' · anulado'}
                </span>
                <span className={styles.muted}>
                  {formatClockTime(payment.createdAt)}
                  {payment.tipClp > 0 && ` · propina ${formatClp(payment.tipClp)}`}
                  {payment.changeClp !== null && ` · vuelto ${formatClp(payment.changeClp)}`}
                  {voided && payment.voidReason && ` · ${payment.voidReason}`}
                </span>
              </span>
              <span className={styles.amount}>{formatClp(payment.amountClp)}</span>
              {!voided && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    onVoid(payment);
                  }}
                >
                  <Undo2 size={18} aria-hidden="true" />
                  Anular
                  <span className="visually-hidden"> pago de {formatClp(payment.amountClp)}</span>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The bill of a table: what each person ordered, what was paid and what is still owed. */
export function TableCheckPage() {
  const { tableId = '' } = useParams();
  const checkQuery = useTableCheck(tableId);
  const [paying, setPaying] = useState(false);
  const [voiding, setVoiding] = useState<Payment | null>(null);

  if (checkQuery.isPending) return <RouteFallback />;
  // After the last payment the table's check closes: keep showing it with a «free» notice.
  if (checkQuery.isError && checkQuery.data === undefined) {
    const free =
      checkQuery.error instanceof ApiRequestError && checkQuery.error.code === 'NOT_FOUND';
    return (
      <div className={styles.page}>
        <BackToTables />
        <EmptyState
          icon={free ? CircleCheck : ReceiptText}
          title={free ? 'La mesa está libre' : 'No pudimos abrir la cuenta'}
          description={free ? 'No tiene una cuenta abierta.' : checkQuery.error.message}
          action={
            <ButtonLink to={`/pedido?mesa=${tableId}`} variant="primary">
              <UtensilsCrossed size={18} aria-hidden="true" />
              Tomar pedido
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const check = checkQuery.data;
  const closed = checkQuery.isError || check.status === 'closed';
  const settledButOpen = !closed && check.balanceClp === 0;
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <BackToTables />
        <h1 className={styles.title}>Cuenta · {check.tableLabel}</h1>
      </div>

      <div className={styles.layout}>
        <section className={styles.section} aria-labelledby="pedidos-titulo">
          <h2 id="pedidos-titulo" className={styles.sectionTitle}>
            Pedidos de la mesa
          </h2>
          <OrdersList check={check} />
          <PaymentsList payments={check.payments} onVoid={setVoiding} />
        </section>

        <Card as="aside" className={styles.aside} aria-label="Resumen de la cuenta">
          <CheckSummary check={check} />
          {closed && (
            <p className={styles.closed} role="status">
              <CircleCheck size={20} aria-hidden="true" />
              Cuenta pagada: la mesa quedó libre.
            </p>
          )}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={closed || settledButOpen}
            onClick={() => {
              setPaying(true);
            }}
          >
            Cobrar
          </Button>
          {settledButOpen && (
            <p className={styles.muted} role="status">
              Cuenta pagada. La mesa se libera cuando cocina entregue todo.
            </p>
          )}
          <ButtonLink to={`/pedido?mesa=${tableId}`} variant="secondary" fullWidth>
            <Plus size={18} aria-hidden="true" />
            Agregar pedido
          </ButtonLink>
          <p className={styles.muted}>¿Llegó alguien más? Su pedido se suma a esta misma cuenta.</p>
        </Card>
      </div>

      <PaymentDialog
        check={check}
        open={paying}
        onClose={() => {
          setPaying(false);
        }}
      />
      <VoidPaymentDialog
        payment={voiding}
        onClose={() => {
          setVoiding(null);
        }}
      />
    </div>
  );
}
