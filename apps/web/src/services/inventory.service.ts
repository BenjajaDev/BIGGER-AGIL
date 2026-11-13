import {
  PurchaseGroupSchema,
  RecipeSchema,
  StockMovementSchema,
  SupplierSchema,
  SupplySchema,
  WasteSummarySchema,
  type MovementInput,
  type RecipeInput,
  type ReportRange,
  type SupplierInput,
  type SupplyInput,
} from '@bigger/shared';
import { z } from 'zod';
import { getJson, requestJson } from './http-client';

const BASE = '/admin/inventory';

export const inventoryService = {
  supplies: (signal?: AbortSignal) =>
    getJson(`${BASE}/supplies`, z.array(SupplySchema), undefined, signal),
  createSupply: (input: SupplyInput) =>
    requestJson('POST', `${BASE}/supplies`, SupplySchema, { body: input }),
  updateSupply: (id: string, input: SupplyInput) =>
    requestJson('PUT', `${BASE}/supplies/${id}`, SupplySchema, { body: input }),
  archiveSupply: (id: string) => requestJson('DELETE', `${BASE}/supplies/${id}`, z.null()),
  registerMovement: (id: string, input: MovementInput) =>
    requestJson('POST', `${BASE}/supplies/${id}/movements`, SupplySchema, { body: input }),
  movements: (signal?: AbortSignal) =>
    getJson(`${BASE}/movements`, z.array(StockMovementSchema), undefined, signal),
  suppliers: (signal?: AbortSignal) =>
    getJson(`${BASE}/suppliers`, z.array(SupplierSchema), undefined, signal),
  createSupplier: (input: SupplierInput) =>
    requestJson('POST', `${BASE}/suppliers`, SupplierSchema, { body: input }),
  updateSupplier: (id: string, input: SupplierInput) =>
    requestJson('PUT', `${BASE}/suppliers/${id}`, SupplierSchema, { body: input }),
  archiveSupplier: (id: string) => requestJson('DELETE', `${BASE}/suppliers/${id}`, z.null()),
  purchaseList: (signal?: AbortSignal) =>
    getJson(`${BASE}/purchase-list`, z.array(PurchaseGroupSchema), undefined, signal),
  recipes: (signal?: AbortSignal) =>
    getJson(`${BASE}/recipes`, z.array(RecipeSchema), undefined, signal),
  setRecipe: (productId: string, input: RecipeInput) =>
    requestJson('PUT', `${BASE}/recipes/${productId}`, z.null(), { body: input }),
  waste: (range: ReportRange, signal?: AbortSignal) =>
    getJson(`${BASE}/waste`, WasteSummarySchema, { from: range.from, to: range.to }, signal),
};
