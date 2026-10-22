import {
  AdminCategorySchema,
  AdminModifierGroupSchema,
  AdminProductSchema,
  AdminSessionSchema,
  ProductTypeSchema,
  UploadedImageSchema,
  type CategoryInput,
  type ModifierGroupInput,
  type ProductInput,
  type ProductTypeInput,
} from '@bigger/shared';
import { z } from 'zod';
import { getJson, requestJson, uploadFile } from './http-client';

const archivedParam = (includeArchived: boolean) => ({ includeArchived: String(includeArchived) });

export const adminService = {
  getSession: (signal?: AbortSignal) =>
    getJson('/admin/session', AdminSessionSchema, undefined, signal),
  login: (pin: string) =>
    requestJson('POST', '/admin/session', AdminSessionSchema, { body: { pin } }),
  logout: () => requestJson('DELETE', '/admin/session', AdminSessionSchema),

  listCategories: (includeArchived: boolean, signal?: AbortSignal) =>
    getJson(
      '/admin/categories',
      z.array(AdminCategorySchema),
      archivedParam(includeArchived),
      signal,
    ),
  createCategory: (input: CategoryInput) =>
    requestJson('POST', '/admin/categories', AdminCategorySchema, { body: input }),
  updateCategory: (id: string, input: CategoryInput) =>
    requestJson('PUT', `/admin/categories/${id}`, AdminCategorySchema, { body: input }),
  archiveCategory: (id: string) =>
    requestJson('DELETE', `/admin/categories/${id}`, AdminCategorySchema),
  restoreCategory: (id: string) =>
    requestJson('POST', `/admin/categories/${id}/restore`, AdminCategorySchema),

  listProducts: (includeArchived: boolean, signal?: AbortSignal) =>
    getJson('/admin/products', z.array(AdminProductSchema), archivedParam(includeArchived), signal),
  getProduct: (id: string, signal?: AbortSignal) =>
    getJson(`/admin/products/${id}`, AdminProductSchema, undefined, signal),
  createProduct: (input: ProductInput) =>
    requestJson('POST', '/admin/products', AdminProductSchema, { body: input }),
  updateProduct: (id: string, input: ProductInput) =>
    requestJson('PUT', `/admin/products/${id}`, AdminProductSchema, { body: input }),
  archiveProduct: (id: string) =>
    requestJson('DELETE', `/admin/products/${id}`, AdminProductSchema),
  restoreProduct: (id: string) =>
    requestJson('POST', `/admin/products/${id}/restore`, AdminProductSchema),

  listModifierGroups: (signal?: AbortSignal) =>
    getJson('/admin/modifier-groups', z.array(AdminModifierGroupSchema), undefined, signal),
  getModifierGroup: (id: string, signal?: AbortSignal) =>
    getJson(`/admin/modifier-groups/${id}`, AdminModifierGroupSchema, undefined, signal),
  createModifierGroup: (input: ModifierGroupInput) =>
    requestJson('POST', '/admin/modifier-groups', AdminModifierGroupSchema, { body: input }),
  updateModifierGroup: (id: string, input: ModifierGroupInput) =>
    requestJson('PUT', `/admin/modifier-groups/${id}`, AdminModifierGroupSchema, { body: input }),
  deleteModifierGroup: (id: string) =>
    requestJson('DELETE', `/admin/modifier-groups/${id}`, AdminModifierGroupSchema),

  listProductTypes: (signal?: AbortSignal) =>
    getJson('/admin/product-types', z.array(ProductTypeSchema), undefined, signal),
  getProductType: (id: string, signal?: AbortSignal) =>
    getJson(`/admin/product-types/${id}`, ProductTypeSchema, undefined, signal),
  createProductType: (input: ProductTypeInput) =>
    requestJson('POST', '/admin/product-types', ProductTypeSchema, { body: input }),
  updateProductType: (id: string, input: ProductTypeInput) =>
    requestJson('PUT', `/admin/product-types/${id}`, ProductTypeSchema, { body: input }),
  deleteProductType: (id: string) =>
    requestJson('DELETE', `/admin/product-types/${id}`, ProductTypeSchema),

  uploadImage: (file: Blob) => uploadFile('/admin/images', file, UploadedImageSchema),
};
