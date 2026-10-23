import { CheckSchema, type CreatePaymentInput } from '@bigger/shared';
import { getJson, requestJson } from './http-client';

export interface PayParams {
  checkId: string;
  input: CreatePaymentInput;
}

export interface SplitParams {
  checkId: string;
  parts: number | null;
}

export interface VoidPaymentParams {
  paymentId: string;
  reason: string;
}

export const checksService = {
  forTable: (tableId: string, signal?: AbortSignal) =>
    getJson(`/tables/${tableId}/check`, CheckSchema, {}, signal),
  get: (checkId: string, signal?: AbortSignal) =>
    getJson(`/checks/${checkId}`, CheckSchema, {}, signal),
  setSplit: ({ checkId, parts }: SplitParams) =>
    requestJson('PUT', `/checks/${checkId}/split`, CheckSchema, { body: { parts } }),
  pay: ({ checkId, input }: PayParams) =>
    requestJson('POST', `/checks/${checkId}/payments`, CheckSchema, { body: input }),
  voidPayment: ({ paymentId, reason }: VoidPaymentParams) =>
    requestJson('POST', `/payments/${paymentId}/void`, CheckSchema, { body: { reason } }),
};
