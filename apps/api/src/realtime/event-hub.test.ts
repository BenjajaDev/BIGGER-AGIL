import type { Order } from '@bigger/shared';
import { describe, expect, it, vi } from 'vitest';
import { EventHub } from './event-hub.js';

const order = { id: 'order-1' } as unknown as Order;

describe('EventHub', () => {
  it('delivers published events to every subscriber', () => {
    const hub = new EventHub();
    const first = vi.fn();
    const second = vi.fn();
    hub.subscribe(first);
    hub.subscribe(second);

    hub.publish({ type: 'order.created', payload: order });

    expect(first).toHaveBeenCalledWith({ type: 'order.created', payload: order });
    expect(second).toHaveBeenCalledOnce();
  });

  it('stops delivering after unsubscribe', () => {
    const hub = new EventHub();
    const listener = vi.fn();
    const unsubscribe = hub.subscribe(listener);

    unsubscribe();
    hub.publish({ type: 'order.updated', payload: order });

    expect(listener).not.toHaveBeenCalled();
    expect(hub.subscriberCount).toBe(0);
  });
});
