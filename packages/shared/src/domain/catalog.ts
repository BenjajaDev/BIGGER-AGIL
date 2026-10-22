import { z } from 'zod';

export const ALLERGENS = ['gluten', 'lacteos', 'huevo', 'frutos-secos', 'soya'] as const;
export const AllergenSchema = z.enum(ALLERGENS);
export type Allergen = z.infer<typeof AllergenSchema>;

export const PriceClpSchema = z.int().nonnegative();

export const PRODUCT_KINDS = ['single', 'combo'] as const;
export const ProductKindSchema = z.enum(PRODUCT_KINDS);
export type ProductKind = z.infer<typeof ProductKindSchema>;

/** Calendar date in the shop's time zone, `YYYY-MM-DD`. */
export const DateOnlySchema = z.iso.date();

/** Uploaded picture. URLs are built by the client from the id (`<id>-card.webp`, `<id>-thumb.webp`). */
export const ImageAssetSchema = z.object({
  id: z.uuid(),
  width: z.int().positive(),
  height: z.int().positive(),
  /** Vertical framing (0 = top, 100 = bottom) used when the image is cropped into a card. */
  focusY: z.int().min(0).max(100),
});
export type ImageAsset = z.infer<typeof ImageAssetSchema>;

export const CategorySchema = z.object({
  id: z.uuid(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(60),
  sortOrder: z.int().nonnegative(),
  image: ImageAssetSchema.nullable(),
});
export type Category = z.infer<typeof CategorySchema>;

/**
 * Per-size override of a customization's selection rule
 * ("Grande: 1 proteína", "Mediano: 0 proteínas"). `maxSelections = 0` = not offered in that size.
 */
export const SizeGroupRuleSchema = z.object({
  groupId: z.uuid(),
  minSelections: z.int().min(0).max(10),
  maxSelections: z.int().min(0).max(10),
});
export type SizeGroupRule = z.infer<typeof SizeGroupRuleSchema>;

export const ProductSizeSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(30),
  priceClp: PriceClpSchema,
  groupRules: z.array(SizeGroupRuleSchema),
});
export type ProductSize = z.infer<typeof ProductSizeSchema>;

/** Featured in the menu's "Promociones" section while today is within the optional dates. */
export const PromotionSchema = z.object({
  startsOn: DateOnlySchema.nullable(),
  endsOn: DateOnlySchema.nullable(),
});
export type Promotion = z.infer<typeof PromotionSchema>;

export const ProductSchema = z.object({
  id: z.uuid(),
  categoryId: z.uuid(),
  typeId: z.uuid().nullable(),
  kind: ProductKindSchema,
  name: z.string().min(1).max(80),
  subtitle: z.string().max(80),
  description: z.string().max(240),
  /** With sizes, the lowest size price ("desde"). */
  priceClp: PriceClpSchema,
  /** For combos: union of the allergens of every product it can include. */
  allergens: z.array(AllergenSchema),
  isAvailable: z.boolean(),
  sortOrder: z.int().nonnegative(),
  image: ImageAssetSchema.nullable(),
  sizes: z.array(ProductSizeSchema),
  promotion: PromotionSchema.nullable(),
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
  /** Optional slots ("Donut, si quieres") may be left empty by the customer. */
  isRequired: z.boolean(),
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
  /** Active promotions (also listed in their own category). */
  promotions: z.array(MenuProductSchema),
  categories: z.array(MenuCategorySchema),
});
export type Menu = z.infer<typeof MenuSchema>;
