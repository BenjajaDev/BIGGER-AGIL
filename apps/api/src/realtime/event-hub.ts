import type { RealtimeEvent } from '@bigger/shared';

export type RealtimeListener = (event: RealtimeEvent) => void;
export type Unsubscribe = () => void;

/** Port used by services to announce domain changes without knowing the transport. */
export interface RealtimePublisher {
  publish: (event: RealtimeEvent) => void;
}

export class EventHub implements RealtimePublisher {
  readonly #listeners = new Set<RealtimeListener>();

  subscribe(listener: RealtimeListener): Unsubscribe {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  publish(event: RealtimeEvent): void {
    for (const listener of this.#listeners) {
      listener(event);
    }
  }

  get subscriberCount(): number {
    return this.#listeners.size;
  }
}
