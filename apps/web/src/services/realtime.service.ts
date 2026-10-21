import { RealtimeEventSchema, type RealtimeEvent } from '@bigger/shared';
import { buildApiUrl } from './http-client';

export type RealtimeConnectionState = 'connecting' | 'open' | 'reconnecting';

export interface RealtimeHandlers {
  onEvent: (event: RealtimeEvent) => void;
  onStateChange: (state: RealtimeConnectionState) => void;
}

/** Subscribes to the API's SSE stream. EventSource reconnects on its own after network drops. */
export function subscribeToRealtime({ onEvent, onStateChange }: RealtimeHandlers): () => void {
  const source = new EventSource(buildApiUrl('/events'));
  onStateChange('connecting');

  source.onopen = () => {
    onStateChange('open');
  };
  source.onerror = () => {
    onStateChange('reconnecting');
  };
  source.onmessage = (message: MessageEvent<string>) => {
    let payload: unknown;
    try {
      payload = JSON.parse(message.data);
    } catch {
      return;
    }
    const parsed = RealtimeEventSchema.safeParse(payload);
    if (parsed.success) onEvent(parsed.data);
  };

  return () => {
    source.close();
  };
}
