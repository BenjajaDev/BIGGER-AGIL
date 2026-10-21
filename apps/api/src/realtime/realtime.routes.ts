import { Router } from 'express';
import type { EventHub } from './event-hub.js';

const HEARTBEAT_MS = 25_000;
const CLIENT_RETRY_MS = 3_000;

/** Server-Sent Events stream: mutations travel over REST, change notifications over this channel. */
export function createRealtimeRouter(hub: EventHub): Router {
  const router = Router();

  router.get('/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`retry: ${CLIENT_RETRY_MS}\n\n`);

    const unsubscribe = hub.subscribe((event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, HEARTBEAT_MS);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  return router;
}
