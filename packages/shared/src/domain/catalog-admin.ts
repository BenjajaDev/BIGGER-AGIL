import { z } from 'zod';
import {
  ALLERGENS,
  AllergenSchema,
  CategorySchema,
  ComboSlotSchema,
  DateOnlySchema,
  ModifierGroupSchema,
  ProductKindSchema,
  ProductSchema,
  ProductSizeSchema,
} from './catalog.js';

export const MAX_PRODUCT_PRICE_CLP = 1_000_000;
export const MAX_COMBO_SLOTS = 6;
export const MAX_OPTIONS_PER_GROUP = 20;
export const MAX_MODIFIER_GROUPS_PER_PRODUCT = 10;
export const MAX_SIZES_PER_PRODUCT = 6;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const name = (max: number) =>
  z.string().trim().min(1, 'Escribe un nombre').max(max, `Máximo ${max} caracteres`);

const priceInput = z
  .int({ error: 'Ingresa un monto en pesos, sin decimales' })
  .min(0, 'El monto no puede ser negativo')
  .max(MAX_PRODUCT_PRICE_CLP, 'El monto parece demasiado alto');

const selections = z.int({ error: 'Ingresa un número entero' }).min(0).max(10, 'Máximo 10');

function hasNoDuplicates(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

const normalized = (text: string) => text.trim().toLocaleLowerCase('es');

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

export const UploadedImageSchema = z.object({
  id: z.uuid(),
  width: z.int().positive(),
  height: z.int().positive(),
});
export type UploadedImage = z.infer<typeof UploadedImageSchema>;

/* ---------- Shared input pieces ---------- */

export const ImageRefInputSchema = z.object({
  imageId: z.uuid(),
  focusY: z.int().min(0).max(100),
});
export type ImageRefInput = z.infer<typeof ImageRefInputSchema>;

export const SizeGroupRuleInputSchema = z
  .object({ groupId: z.uuid(), minSelections: selections, maxSelections: selections })
  .refine((rule) => rule.minSelections <= rule.maxSelections, {
    message: 'El mínimo no puede superar al máximo',
    path: ['minSelections'],
  });

export const SizeInputSchema = z.object({
  /** Present when editing an existing size, so its identity is preserved. */
  id: z.uuid().optional(),
  name: name(30),
  priceClp: priceInput,
  groupRules: z.array(SizeGroupRuleInputSchema).max(MAX_MODIFIER_GROUPS_PER_PRODUCT),
});
export type SizeInput = z.infer<typeof SizeInputSchema>;

const sizesInput = z
  .array(SizeInputSchema)
  .max(MAX_SIZES_PER_PRODUCT, `Máximo ${MAX_SIZES_PER_PRODUCT} tamaños`)
  .refine(
    (sizes) => hasNoDuplicates(sizes.map((size) => normalized(size.name))),
    'Hay tamaños con el mismo nombre',
  );

const modifierGroupIdsInput = z
  .array(z.uuid())
  .max(
    MAX_MODIFIER_GROUPS_PER_PRODUCT,
    `Máximo ${MAX_MODIFIER_GROUPS_PER_PRODUCT} personalizaciones`,
  )
  .refine(hasNoDuplicates, 'Personalizaciones repetidas');

/** Size rules may only refer to customizations the product offers, once per size. */
function checkSizeRules(
  value: { sizes: readonly SizeInput[]; modifierGroupIds: readonly string[] },
  ctx: z.RefinementCtx,
): void {
  value.sizes.forEach((size, sizeIndex) => {
    size.groupRules.forEach((rule, ruleIndex) => {
      if (!value.modifierGroupIds.includes(rule.groupId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'La personalización no está asignada al producto',
          path: ['sizes', sizeIndex, 'groupRules', ruleIndex, 'groupId'],
        });
      }
    });
    if (!hasNoDuplicates(size.groupRules.map((rule) => rule.groupId))) {
      ctx.addIssue({
        code: 'custom',
        message: 'Regla repetida para una personalización',
        path: ['sizes', sizeIndex, 'groupRules'],
      });
    }
  });
}

export const PromotionInputSchema = z
  .object({ startsOn: DateOnlySchema.nullable(), endsOn: DateOnlySchema.nullable() })
  .refine((promo) => !promo.startsOn || !promo.endsOn || promo.startsOn <= promo.endsOn, {
    message: 'La fecha de término es anterior al inicio',
    path: ['endsOn'],
  });
export type PromotionInput = z.infer<typeof PromotionInputSchema>;

/* ---------- Inputs ---------- */

export const CategoryInputSchema = z.object({
  name: name(60),
  image: ImageRefInputSchema.nullable().default(null),
});
export type CategoryInput = z.infer<typeof CategoryInputSchema>;

const productBaseInput = {
  categoryId: z.uuid('Elige una categoría'),
  typeId: z.uuid().nullable(),
  name: name(80),
  subtitle: z.string().trim().max(80, 'Máximo 80 caracteres'),
  description: z.string().trim().max(240, 'Máximo 240 caracteres'),
  isAvailable: z.boolean(),
  image: ImageRefInputSchema.nullable(),
  promotion: PromotionInputSchema.nullable(),
};

/** The minimum to put a simple product on the menu from the list ("carga rápida"). */
export const QuickProductInputSchema = z.object({
  categoryId: productBaseInput.categoryId,
  name: productBaseInput.name,
  priceClp: priceInput,
});
export type QuickProductInput = z.infer<typeof QuickProductInputSchema>;

export const SingleProductInputSchema = z
  .object({
    kind: z.literal('single'),
    ...productBaseInput,
    /** Required without sizes; with sizes the price is each size's own. */
    priceClp: priceInput.nullable(),
    sizes: sizesInput,
    allergens: z
      .array(AllergenSchema)
      .max(ALLERGENS.length)
      .refine(hasNoDuplicates, 'Alérgenos repetidos'),
    modifierGroupIds: modifierGroupIdsInput,
  })
  .superRefine((product, ctx) => {
    if (product.sizes.length === 0 && product.priceClp === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ingresa un precio o agrega tamaños',
        path: ['priceClp'],
      });
    }
    checkSizeRules(product, ctx);
  });
export type SingleProductInput = z.infer<typeof SingleProductInputSchema>;

export const ComboSlotInputSchema = z.object({
  name: name(40),
  isRequired: z.boolean(),
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
  priceClp: priceInput,
  comboSlots: z
    .array(ComboSlotInputSchema)
    .min(1, 'Un combo necesita al menos un espacio')
    .max(MAX_COMBO_SLOTS, `Máximo ${MAX_COMBO_SLOTS} espacios`)
    .refine(
      (slots) => slots.some((slot) => slot.isRequired),
      'Al menos un espacio debe ser obligatorio',
    ),
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
    minSelections: selections,
    maxSelections: selections.min(1, 'Debe permitir elegir al menos 1'),
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
  .refine((group) => hasNoDuplicates(group.options.map((option) => normalized(option.name))), {
    message: 'Hay opciones con el mismo nombre',
    path: ['options'],
  });
export type ModifierGroupInput = z.infer<typeof ModifierGroupInputSchema>;

/* ---------- Product types (templates) ---------- */

export const TemplateComboSlotSchema = z.object({ name: name(40), isRequired: z.boolean() });
export type TemplateComboSlot = z.infer<typeof TemplateComboSlotSchema>;

/**
 * A product type is a template ("Ensalada armable", "Combo café + dulce"): choosing it pre-fills
 * a new product's sizes, customizations, per-size rules and combo slots. Products stay editable.
 */
export const ProductTypeInputSchema = z
  .object({
    name: name(40),
    description: z.string().trim().max(160, 'Máximo 160 caracteres'),
    kind: ProductKindSchema,
    sizes: sizesInput,
    modifierGroupIds: modifierGroupIdsInput,
    comboSlots: z
      .array(TemplateComboSlotSchema)
      .max(MAX_COMBO_SLOTS, `Máximo ${MAX_COMBO_SLOTS} espacios`),
  })
  .superRefine(checkSizeRules);
export type ProductTypeInput = z.infer<typeof ProductTypeInputSchema>;

export const ProductTypeSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string(),
  kind: ProductKindSchema,
  sizes: z.array(ProductSizeSchema.omit({ id: true })),
  modifierGroupIds: z.array(z.uuid()),
  comboSlots: z.array(TemplateComboSlotSchema),
  productCount: z.int().nonnegative(),
});
export type ProductType = z.infer<typeof ProductTypeSchema>;

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
