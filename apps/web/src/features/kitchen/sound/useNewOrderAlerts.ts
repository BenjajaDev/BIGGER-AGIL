import type { Order } from '@bigger/shared';
import { useEffect, useRef } from 'react';
import type { ChimePlayer } from './chime-player';
import { detectNewOrders } from './new-order-detector';

export interface NewOrderAlerts {
  orders: readonly Order[] | undefined;
  soundOn: boolean;
  player: ChimePlayer;
  onNewOrders: (orders: readonly Order[]) => void;
}

/**
 * Chimes once per batch of new orders. The first load only learns what is already there, so
 * opening the screen, reconnecting or reprinting never makes noise.
 */
export function useNewOrderAlerts({ orders, soundOn, player, onNewOrders }: NewOrderAlerts): void {
  const seen = useRef<Set<string> | null>(null);
  const latest = useRef({ soundOn, player, onNewOrders });
  latest.current = { soundOn, player, onNewOrders };

  useEffect(() => {
    if (!orders) return;
    if (seen.current === null) {
      seen.current = new Set(orders.map((order) => order.id));
      return;
    }
    const arrived = detectNewOrders(seen.current, orders);
    for (const order of orders) seen.current.add(order.id);
    if (arrived.length === 0) return;
    latest.current.onNewOrders(arrived);
    if (latest.current.soundOn) {
      latest.current.player.play().catch(() => undefined);
    }
  }, [orders]);
}
