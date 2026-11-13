import { TableLabelSchema, TableQrSchema } from '@bigger/shared';
import { z } from 'zod';
import { getJson, requestJson } from './http-client';

export const tableQrService = {
  list: (signal?: AbortSignal) =>
    getJson('/admin/tables/qr', z.array(TableQrSchema), undefined, signal),
  regenerate: (id: string) =>
    requestJson('POST', `/admin/tables/${id}/qr/regenerate`, z.array(TableQrSchema)),
  /** Public: the name of the table a QR belongs to. */
  label: (token: string, signal?: AbortSignal) =>
    getJson(`/menu/table/${token}`, TableLabelSchema, undefined, signal),
};
