import type { KitchenOrderStatus, Order } from '@bigger/shared';
import { DragDropProvider, KeyboardSensor, type DragDropManager } from '@dnd-kit/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { orderTitle } from '../../orders/order-text';
import { KITCHEN_COLUMNS } from '../kitchen-columns';
import {
  KitchenKeyboardSensor,
  kitchenDropStatus,
  matchesKitchenDrag,
  type KitchenDragSnapshot,
} from '../kitchen-drag';
import type { OrdersByKitchenStatus } from '../useKitchenOrders';
import styles from './KitchenBoard.module.css';
import { KitchenColumn } from './KitchenColumn';

export interface KitchenBoardProps {
  orders: OrdersByKitchenStatus;
  now: Date;
  onAdvance?: (order: Order, destination?: KitchenOrderStatus) => void;
  pendingOrderIds?: ReadonlySet<string>;
}

export function KitchenBoard({ orders, now, onAdvance, pendingOrderIds }: KitchenBoardProps) {
  const [drag, setDrag] = useState<KitchenDragSnapshot | null>(null);
  const active = useRef<{ snapshot: KitchenDragSnapshot; manager: DragDropManager } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const allOrders = useMemo(() => Object.values(orders).flat(), [orders]);

  useEffect(() => {
    if (!active.current) return;
    const { snapshot, manager } = active.current;
    if (
      !matchesKitchenDrag(
        allOrders.find((order) => order.id === snapshot.id),
        snapshot,
      ) ||
      pendingOrderIds?.has(snapshot.id)
    ) {
      manager.actions.stop({ canceled: true });
      setAnnouncement('El pedido cambió durante el arrastre. Se canceló el movimiento.');
    }
  }, [allOrders, pendingOrderIds]);

  return (
    <DragDropProvider
      sensors={(defaults) =>
        defaults.map((sensor) => (sensor === KeyboardSensor ? KitchenKeyboardSensor : sensor))
      }
      plugins={(defaults) =>
        defaults.map((entry) => ({
          plugin: typeof entry === 'function' ? entry : entry.plugin,
          // Retain the default plugins, silence their English announcements, and avoid a
          // drop animation toward an unconfirmed destination. Spanish feedback lives below.
          options: {
            ...(typeof entry === 'function' ? {} : entry.options),
            announcements: {},
            dropAnimation: null,
          },
        }))
      }
      onBeforeDragStart={(event) => {
        const source = allOrders.find((order) => order.id === event.operation.source?.id);
        if (!source || !onAdvance || source.status === 'ready' || pendingOrderIds?.has(source.id))
          event.preventDefault();
      }}
      onDragStart={(event, manager) => {
        const source = allOrders.find((order) => order.id === event.operation.source?.id);
        if (!source) return;
        const snapshot = { id: source.id, status: source.status, updatedAt: source.updatedAt };
        active.current = { snapshot, manager };
        setDrag(snapshot);
        setAnnouncement(
          `Arrastrando ${orderTitle(source)}. Usa la flecha derecha o abajo para ir a la siguiente columna.`,
        );
      }}
      onDragOver={(event) => {
        const destination =
          active.current &&
          kitchenDropStatus(active.current.snapshot.status, event.operation.target?.id);
        const column = KITCHEN_COLUMNS.find((candidate) => candidate.status === destination);
        setAnnouncement(
          column
            ? `Destino: ${column.title}. Suelta para solicitar el cambio.`
            : 'Fuera de un destino permitido.',
        );
      }}
      onDragEnd={(event) => {
        const snapshot = active.current?.snapshot;
        active.current = null;
        setDrag(null);
        if (event.canceled || !snapshot) {
          setAnnouncement('Arrastre cancelado.');
          return;
        }
        const current = allOrders.find((order) => order.id === snapshot.id);
        const destination = kitchenDropStatus(snapshot.status, event.operation.target?.id);
        const target = event.operation.target?.element;
        const pointer = event.nativeEvent;
        const rect = target?.getBoundingClientRect();
        const outside =
          pointer instanceof MouseEvent &&
          rect &&
          (pointer.clientX < rect.left ||
            pointer.clientX > rect.right ||
            pointer.clientY < rect.top ||
            pointer.clientY > rect.bottom);
        if (
          !matchesKitchenDrag(current, snapshot) ||
          !destination ||
          outside ||
          pendingOrderIds?.has(snapshot.id)
        ) {
          setAnnouncement('Movimiento no permitido. El pedido conserva su estado confirmado.');
          return;
        }
        setAnnouncement('Solicitando cambio de estado.');
        onAdvance?.(current, destination);
      }}
    >
      <p id="kitchen-drag-instructions" className="visually-hidden">
        Para arrastrar, pulsa Espacio o Enter. Usa la flecha derecha o abajo para ir a la siguiente
        columna. Pulsa Espacio o Enter para soltar, o Escape para cancelar. También puedes usar los
        botones del pedido.
      </p>
      <p role="status" className="visually-hidden">
        {announcement}
      </p>
      <div className={styles.board}>
        {KITCHEN_COLUMNS.map((column) => (
          <KitchenColumn
            key={column.status}
            column={column}
            orders={orders[column.status]}
            now={now}
            pendingOrderIds={pendingOrderIds}
            validDrop={drag !== null && kitchenDropStatus(drag.status, column.status) !== null}
            {...(onAdvance ? { onAdvance } : {})}
          />
        ))}
      </div>
    </DragDropProvider>
  );
}
