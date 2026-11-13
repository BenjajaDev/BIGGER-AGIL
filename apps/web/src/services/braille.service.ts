import { BraillePlateSchema } from '@bigger/shared';
import { z } from 'zod';
import { buildApiUrl, getJson } from './http-client';

export const brailleService = {
  plates: (signal?: AbortSignal) =>
    getJson('/admin/braille/plates', z.array(BraillePlateSchema), undefined, signal),
  /** The STL is a file download: the browser sends the admin cookie by itself. */
  stlUrl: (plateId: string) => buildApiUrl(`/admin/braille/plates/${plateId}/stl`),
};
