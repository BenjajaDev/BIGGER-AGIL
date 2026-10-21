import { z } from 'zod';

export const ALLERGENS = ['gluten', 'lacteos', 'huevo', 'frutos-secos', 'soya'] as const;
export const AllergenSchema = z.enum(ALLERGENS);
export type Allergen = z.infer<typeof AllergenSchema>;

export const PriceClpSchema = z.int().nonnegative();

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
  name: z.string().min(1).max(80),
  description: z.string().max(240),
  priceClp: PriceClpSchema,
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

export const MenuCategorySchema = CategorySchema.extend({
  products: z.array(ProductSchema),
});
export type MenuCategory = z.infer<typeof MenuCategorySchema>;

export const MenuSchema = z.object({
  categories: z.array(MenuCategorySchema),
});
export type Menu = z.infer<typeof MenuSchema>;
