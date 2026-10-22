import {
  canTransitionOrder,
  KITCHEN_ORDER_STATUSES,
  type KitchenOrderStatus,
  type Order,
} from '@bigger/shared';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { queryKeys } from '../../app/query-keys';
import { useNow } from '../../hooks/useNow';
import { ApiRequestError } from '../../services/http-client';
import { orderTitle } from '../orders/order-text';
import { useUpdateOrderStatus } from '../orders/useOrders';
import { KitchenBoard } from './components/KitchenBoard';
import { KITCHEN_COLUMNS } from './kitchen-columns';
import { matchesKitchenDrag } from './kitchen-drag';
import styles from './KitchenPage.module.css';
import { groupByKitchenStatus, useKitchenOrders } from './useKitchenOrders';

export function KitchenPage() {
  const ordersQuery = useKitchenOrders();
  const queryClient = useQueryClient();
  const now = useNow(15_000);
  const updateStatus = useUpdateOrderStatus();
  const pendingIdsRef = useRef(new Set<string>());
  const [pendingOrderIds, setPendingOrderIds] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const pageRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [focusTarget, setFocusTarget] = useState<{
    orderId: string;
    origin: Element | null;
  } | null>(null);

  useEffect(() => {
    if (!focusTarget || !focusTarget.origin || document.activeElement !== document.body) return;
    const selector = focusTarget.origin.hasAttribute('data-drag-handle')
      ? '[data-drag-handle]'
      : 'button[data-order-action]';
    const button =
      pageRef.current?.querySelector<HTMLButtonElement>(
        `[data-order-id="${focusTarget.orderId}"] ${selector}`,
      ) ??
      pageRef.current?.querySelector<HTMLButtonElement>(
        `[data-order-id="${focusTarget.orderId}"] [data-order-action]`,
      );
    (button ?? headingRef.current)?.focus();
  }, [focusTarget]);

  const advanceOrder = async (order: Order, destination?: KitchenOrderStatus) => {
    const current = queryClient
      .getQueryData<Order[]>(queryKeys.orderList({ statuses: KITCHEN_ORDER_STATUSES }))
      ?.find((candidate) => candidate.id === order.id);
    if (!matchesKitchenDrag(current, order)) {
      setError('El pedido cambió en otro dispositivo. Revisa su estado actualizado.');
      return;
    }
    const action = KITCHEN_COLUMNS.find((column) => column.status === order.status)?.action;
    if (
      !action ||
      (destination !== undefined && destination !== action.nextStatus) ||
      !canTransitionOrder(order.status, action.nextStatus) ||
      pendingIdsRef.current.has(order.id)
    )
      return;

    const origin = document.activeElement;
    const title = orderTitle(order);
    pendingIdsRef.current.add(order.id);
    setPendingOrderIds(new Set(pendingIdsRef.current));
    setError(null);
    setAnnouncement(`Guardando cambio de ${title}.`);
    try {
      await updateStatus.mutateAsync({ orderId: order.id, input: { status: action.nextStatus } });
      setAnnouncement(
        `${title}: ${action.nextStatus === 'delivered' ? 'pedido entregado' : 'estado actualizado'}.`,
      );
    } catch (caught) {
      const detail =
        caught instanceof ApiRequestError &&
        (caught.code === 'CONFLICT' || caught.code === 'INVALID_STATE_TRANSITION')
          ? 'El pedido cambió o la transición ya no está permitida. Se solicitó actualizar la vista.'
          : caught instanceof ApiRequestError
            ? caught.message
            : 'Inténtalo de nuevo.';
      setError(`No se pudo actualizar ${title}. ${detail}`);
      setAnnouncement('');
    } finally {
      pendingIdsRef.current.delete(order.id);
      setPendingOrderIds(new Set(pendingIdsRef.current));
      setFocusTarget({ orderId: order.id, origin });
    }
  };

  return (
    <div className={styles.page} ref={pageRef}>
      <h1 className="visually-hidden" tabIndex={-1} ref={headingRef}>
        Vista de cocina
      </h1>
      <p role="status" className="visually-hidden">
        {announcement}
      </p>
      {error && (
        <p role="alert" className={styles.error}>
          <AlertCircle size={20} aria-hidden="true" />
          {error}
        </p>
      )}
      <AsyncContent query={ordersQuery} loadingLabel="Cargando pedidos…" inverse>
        {(orders) => (
          <KitchenBoard
            orders={groupByKitchenStatus(orders)}
            now={now}
            pendingOrderIds={pendingOrderIds}
            onAdvance={(order, destination) => {
              void advanceOrder(order, destination);
            }}
          />
        )}
      </AsyncContent>
    </div>
  );
}
