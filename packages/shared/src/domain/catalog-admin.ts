import { z } from 'zod';
import {
  ALLERGENS,
  AllergenSchema,
  CategorySchema,
  ComboSlotSchema,
  ModifierGroupSchema,
  ProductSchema,
} from './catalog.js';

export const MAX_PRODUCT_PRICE_CLP = 1_000_000;
export const MAX_COMBO_SLOTS = 6;
export const MAX_OPTIONS_PER_GROUP = 20;
export const MAX_MODIFIER_GROUPS_PER_PRODUCT = 10;

const name = (max: number) =>
  z.string().trim().min(1, 'Escribe un nombre').max(max, `Máximo ${max} caracteres`);

const priceInput = z
  .int({ error: 'Ingresa un monto en pesos, sin decimales' })
  .min(0, 'El monto no puede ser negativo')
  .max(MAX_PRODUCT_PRICE_CLP, 'El monto parece demasiado alto');

function hasNoDuplicates(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

/* ---------- Read models (admin) ---------- */

export const AdminCategorySchema = CategorySchema.extend({
  archivedAt: z.iso.datetime().nullable(),
  activeProductCount: z.int().nonnegative(),
});
export type AdminCategory = z.infer<typeof AdminCategorySchema>;

export const AdminProductSchema = ProductSchema.extend({
  archivedAt: z.iso.datetime().nullable(),
  modifierGroupIds: z.array(z.uuid()),
  comboSlots: z.array(ComboSlotSchema),
});
export type AdminProduct = z.infer<typeof AdminProductSchema>;

export const AdminModifierGroupSchema = ModifierGroupSchema.extend({
  productCount: z.int().nonnegative(),
});
export type AdminModifierGroup = z.infer<typeof AdminModifierGroupSchema>;

export const IncludeArchivedQuerySchema = z.object({
  includeArchived: z.stringbool().default(false),
});

/* ---------- Inputs ---------- */

export const CategoryInputSchema = z.object({ name: name(60) });
export type CategoryInput = z.infer<typeof CategoryInputSchema>;

const productBaseInput = {
  categoryId: z.uuid('Elige una categoría'),
  name: name(80),
  description: z.string().trim().max(240, 'Máximo 240 caracteres'),
  priceClp: priceInput,
  isAvailable: z.boolean(),
};

export const SingleProductInputSchema = z.object({
  kind: z.literal('single'),
  ...productBaseInput,
  allergens: z
    .array(AllergenSchema)
    .max(ALLERGENS.length)
    .refine(hasNoDuplicates, 'Alérgenos repetidos'),
  modifierGroupIds: z
    .array(z.uuid())
    .max(
      MAX_MODIFIER_GROUPS_PER_PRODUCT,
      `Máximo ${MAX_MODIFIER_GROUPS_PER_PRODUCT} personalizaciones`,
    )
    .refine(hasNoDuplicates, 'Personalizaciones repetidas'),
});
export type SingleProductInput = z.infer<typeof SingleProductInputSchema>;

export const ComboSlotInputSchema = z.object({
  name: name(40),
  options: z
    .array(
      z.object({
        productId: z.uuid('Elige un producto'),
        extraPriceClp: priceInput,
      }),
    )
    .min(1, 'Agrega al menos una opción')
    .max(MAX_OPTIONS_PER_GROUP, `Máximo ${MAX_OPTIONS_PER_GROUP} opciones`)
    .refine(
      (options) => hasNoDuplicates(options.map((option) => option.productId)),
      'Un producto aparece dos veces en este espacio',
    ),
});
export type ComboSlotInput = z.infer<typeof ComboSlotInputSchema>;

export const ComboProductInputSchema = z.object({
  kind: z.literal('combo'),
  ...productBaseInput,
  comboSlots: z
    .array(ComboSlotInputSchema)
    .min(1, 'Un combo necesita al menos un espacio')
    .max(MAX_COMBO_SLOTS, `Máximo ${MAX_COMBO_SLOTS} espacios`),
});
export type ComboProductInput = z.infer<typeof ComboProductInputSchema>;

export const ProductInputSchema = z.discriminatedUnion('kind', [
  SingleProductInputSchema,
  ComboProductInputSchema,
]);
export type ProductInput = z.infer<typeof ProductInputSchema>;

export const ModifierOptionInputSchema = z.object({
  /** Present when editing an existing option, so its identity is preserved. */
  id: z.uuid().optional(),
  name: name(40),
  priceDeltaClp: priceInput,
  isAvailable: z.boolean(),
});
export type ModifierOptionInput = z.infer<typeof ModifierOptionInputSchema>;

export const ModifierGroupInputSchema = z
  .object({
    name: name(40),
    minSelections: z.int().min(0).max(10),
    maxSelections: z.int().min(1, 'Debe permitir elegir al menos 1').max(10),
    options: z
      .array(ModifierOptionInputSchema)
      .min(1, 'Agrega al menos una opción')
      .max(MAX_OPTIONS_PER_GROUP, `Máximo ${MAX_OPTIONS_PER_GROUP} opciones`),
  })
  .refine((group) => group.minSelections <= group.maxSelections, {
    message: 'El mínimo no puede superar al máximo',
    path: ['minSelections'],
  })
  .refine((group) => group.maxSelections <= group.options.length, {
    message: 'No puede permitir elegir más opciones de las que existen',
    path: ['maxSelections'],
  })
  .refine(
    (group) =>
      hasNoDuplicates(group.options.map((option) => option.name.trim().toLocaleLowerCase('es'))),
    { message: 'Hay opciones con el mismo nombre', path: ['options'] },
  );
export type ModifierGroupInput = z.infer<typeof ModifierGroupInputSchema>;

/* ---------- Admin session ---------- */

export const AdminLoginInputSchema = z.object({
  pin: z.string().regex(/^\d{4,12}$/, 'El PIN tiene entre 4 y 12 dígitos'),
});
export type AdminLoginInput = z.infer<typeof AdminLoginInputSchema>;

export const AdminSessionSchema = z.object({
  authenticated: z.boolean(),
  expiresAt: z.iso.datetime().nullable(),
});
export type AdminSession = z.infer<typeof AdminSessionSchema>;
