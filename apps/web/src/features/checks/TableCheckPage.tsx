import type { Check, Payment } from '@bigger/shared';
import {
  CircleCheck,
  CircleDollarSign,
  Plus,
  Printer,
  ReceiptText,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { Page } from '../../components/layout/Page';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ApiRequestError } from '../../services/http-client';
import { formatClockTime, formatClp } from '../../lib/format';
import { ORDER_STATUS_PRESENTATION } from '../orders/order-status';
import { describeOrderItem } from '../orders/order-text';
import { usePrinterStatus, useReprintOrder } from '../printing/usePrinter';
import { PaymentDialog } from './components/PaymentDialog';
import { VoidPaymentDialog } from './components/VoidPaymentDialog';
import {
  orderLabel,
  PAYMENT_METHOD_PRESENTATION,
  PAYMENT_MODE_LABEL,
} from './payment-presentation';
import styles from './TableCheckPage.module.css';
import { useTableCheck } from './useChecks';

const BACK = { to: '/mesas', label: 'Mesas' } as const;

function CheckBadge({ check, closed }: { check: Check; closed: boolean }) {
  if (closed || check.balanceClp === 0) {
    return <StatusBadge tone="success" icon={CircleCheck} label="Pagada" />;
  }
  if (check.paidClp > 0) {
    return <StatusBadge tone="highlight" icon={CircleDollarSign} label="Pago parcial" />;
  }
  return <StatusBadge tone="accent" icon={UtensilsCrossed} label="Abierta" />;
}

function CheckLoading() {
  return (
    <Page>
      <PageHeader title="Cuenta de mesa" back={BACK} />
      <div role="status">
        <span className="visually-hidden">Cargando cuenta…</span>
        <div className={styles.layout}>
          <Skeleton lines={3} height="6rem" />
          <Skeleton lines={2} height="5rem" />
        </div>
      </div>
    </Page>
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
  const printer = usePrinterStatus();
  const reprint = useReprintOrder();
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
              {printer.data?.enabled && !cancelled && (
                <Button
                  variant="ghost"
                  disabled={reprint.isPending}
                  onClick={() => {
                    reprint.mutate(order.id);
                  }}
                >
                  <Printer size={18} aria-hidden="true" />
                  Reimprimir
                  <span className="visually-hidden"> comanda de {orderLabel(order, index)}</span>
                </Button>
              )}
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
      <SectionHeader title="Pagos" id="pagos-titulo" />
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
                  variant="danger"
                  onClick={() => {
                    onVoid(payment);
                  }}
                >
                  <Trash2 size={18} aria-hidden="true" />
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

  if (checkQuery.isPending) return <CheckLoading />;
  // After the last payment the table's check closes: keep showing it with a «free» notice.
  if (checkQuery.isError && checkQuery.data === undefined) {
    const free =
      checkQuery.error instanceof ApiRequestError && checkQuery.error.code === 'NOT_FOUND';
    return (
      <Page width="narrow">
        <PageHeader title="Cuenta de mesa" back={BACK} />
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
      </Page>
    );
  }

  const check = checkQuery.data;
  const closed = checkQuery.isError || check.status === 'closed';
  const settledButOpen = !closed && check.balanceClp === 0;
  return (
    <Page>
      <PageHeader
        back={BACK}
        title={`Cuenta · ${check.tableLabel}`}
        documentTitle={`${check.tableLabel} · BIGGER`}
        subtitle={<CheckBadge check={check} closed={closed} />}
      />

      <div className={styles.layout}>
        <section className={styles.section} aria-labelledby="pedidos-titulo">
          <SectionHeader title="Pedidos de la mesa" id="pedidos-titulo" />
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
    </Page>
  );
}
