import type { Order } from '@bigger/shared';

/** What the orders module needs from billing, without depending on how checks are stored. */
export interface CheckHooks {
  /** Rejects cancelling an order whose products were already paid. */
  assertCanCancel: (order: Order) => Promise<void>;
  /** An order was added or changed status: the check may now be settled (and closed). */
  afterOrderChange: (checkId: string) => Promise<void>;
}
