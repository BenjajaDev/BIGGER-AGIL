import { TableOverviewSchema } from '@bigger/shared';
import { z } from 'zod';
import { getJson } from './http-client';

export const tablesService = {
  listOverview: (signal?: AbortSignal) =>
    getJson('/tables', z.array(TableOverviewSchema), undefined, signal),
};
