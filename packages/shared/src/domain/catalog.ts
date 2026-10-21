import { z } from 'zod';

export const ALLERGENS = ['gluten', 'lacteos', 'huevo', 'frutos-secos', 'soya'] as const;
export const AllergenSchema = z.enum(ALLERGENS);
export type Allergen = z.infer<typeof AllergenSchema>;

export const PriceClpSchema = z.int().nonnegative();

export const PRODUCT_KINDS = ['single', 'combo'] as const;
export const ProductKindSchema = z.enum(PRODUCT_KINDS);
export type ProductKind = z.infer<typeof ProductKindSchema>;

export const CategorySchema = z.object({
  id: z.uuid(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(60),
  sortOrder: z.int().nonnegative(),
});
export type Category = z.infer<typeof CategorySchema>;

export const ProductSchema = z.object({
  id: z.uuid(),
  categoryId: z.uuid(),
  kind: ProductKindSchema,
  name: z.string().min(1).max(80),
  description: z.string().max(240),
  priceClp: PriceClpSchema,
  /** For combos: union of the allergens of every product it can include. */
  allergens: z.array(AllergenSchema),
  isAvailable: z.boolean(),
  sortOrder: z.int().nonnegative(),
});
export type Product = z.infer<typeof ProductSchema>;

export const ProductFilterSchema = z.object({
  categoryId: z.uuid().optional(),
  onlyAvailable: z.stringbool().optional(),
});
export type ProductFilter = z.infer<typeof ProductFilterSchema>;

export const ModifierOptionSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(40),
  priceDeltaClp: PriceClpSchema,
  isAvailable: z.boolean(),
});
export type ModifierOption = z.infer<typeof ModifierOptionSchema>;

/** Reusable customization ("Tipo de leche"): `minSelections ≥ 1` makes it mandatory. */
export const ModifierGroupSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(40),
  minSelections: z.int().min(0).max(10),
  maxSelections: z.int().min(1).max(10),
  options: z.array(ModifierOptionSchema),
});
export type ModifierGroup = z.infer<typeof ModifierGroupSchema>;

export const ComboSlotOptionSchema = z.object({
  productId: z.uuid(),
  productName: z.string(),
  extraPriceClp: PriceClpSchema,
  /** False when the product is sold out or was removed from the menu. */
  isAvailable: z.boolean(),
  allergens: z.array(AllergenSchema),
});
export type ComboSlotOption = z.infer<typeof ComboSlotOptionSchema>;

/** One choice inside a combo ("Café a elección"); a fixed combo has a single option per slot. */
export const ComboSlotSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(40),
  options: z.array(ComboSlotOptionSchema),
});
export type ComboSlot = z.infer<typeof ComboSlotSchema>;

export const MenuProductSchema = ProductSchema.extend({
  modifierGroups: z.array(ModifierGroupSchema),
  comboSlots: z.array(ComboSlotSchema),
});
export type MenuProduct = z.infer<typeof MenuProductSchema>;

export const MenuCategorySchema = CategorySchema.extend({
  products: z.array(MenuProductSchema),
});
export type MenuCategory = z.infer<typeof MenuCategorySchema>;

export const MenuSchema = z.object({
  categories: z.array(MenuCategorySchema),
});
export type Menu = z.infer<typeof MenuSchema>;
