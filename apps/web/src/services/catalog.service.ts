import { CategorySchema, MenuSchema, ProductSchema, type ProductFilter } from '@bigger/shared';
import { z } from 'zod';
import { getJson } from './http-client';

export const catalogService = {
  listCategories: (signal?: AbortSignal) =>
    getJson('/categories', z.array(CategorySchema), undefined, signal),

  listProducts: (filter: ProductFilter, signal?: AbortSignal) =>
    getJson(
      '/products',
      z.array(ProductSchema),
      {
        categoryId: filter.categoryId,
        onlyAvailable:
          filter.onlyAvailable === undefined ? undefined : String(filter.onlyAvailable),
      },
      signal,
    ),

  getMenu: (signal?: AbortSignal) => getJson('/menu', MenuSchema, undefined, signal),
};
