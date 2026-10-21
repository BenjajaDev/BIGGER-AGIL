import type { ApiSuccessBody } from '@bigger/shared';
import type { Response } from 'express';

export function sendData(res: Response, data: unknown, status = 200): void {
  const body: ApiSuccessBody<unknown> = { data };
  res.status(status).json(body);
}
