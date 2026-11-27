import { SystemInfoSchema } from '@bigger/shared';
import { getJson } from './http-client';

export const systemService = {
  info: (signal?: AbortSignal) =>
    getJson('/admin/system/info', SystemInfoSchema, undefined, signal),
};
