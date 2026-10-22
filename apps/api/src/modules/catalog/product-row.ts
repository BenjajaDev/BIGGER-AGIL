import type { Category, ImageAsset, Product } from '@bigger/shared';
import { categories, images, products } from '../../db/schema.js';

/**
 * Columns every product read model selects. Queries must `leftJoin(images, eq(products.imageId,
 * images.id))` so the image dimensions come along.
 */
export const productRowColumns = {
  id: products.id,
  categoryId: products.categoryId,
  typeId: products.typeId,
  kind: products.kind,
  name: products.name,
  subtitle: products.subtitle,
  description: products.description,
  priceClp: products.priceClp,
  allergens: products.allergens,
  isAvailable: products.isAvailable,
  sortOrder: products.sortOrder,
  imageId: products.imageId,
  imageFocusY: products.imageFocusY,
  imageWidth: images.width,
  imageHeight: images.height,
  isPromotion: products.isPromotion,
  promoStartsOn: products.promoStartsOn,
  promoEndsOn: products.promoEndsOn,
};

export interface ImageColumns {
  imageId: string | null;
  imageFocusY: number;
  imageWidth: number | null;
  imageHeight: number | null;
}

export type ProductRow = Omit<Product, 'image' | 'sizes' | 'promotion'> &
  ImageColumns & {
    isPromotion: boolean;
    promoStartsOn: string | null;
    promoEndsOn: string | null;
  };

export function toImageAsset(row: ImageColumns): ImageAsset | null {
  if (row.imageId === null || row.imageWidth === null || row.imageHeight === null) return null;
  return {
    id: row.imageId,
    width: row.imageWidth,
    height: row.imageHeight,
    focusY: row.imageFocusY,
  };
}

/** Row → product without its relations (sizes are attached by the caller). */
export function toProductBase(row: ProductRow): Omit<Product, 'sizes'> {
  const {
    imageId,
    imageFocusY,
    imageWidth,
    imageHeight,
    isPromotion,
    promoStartsOn,
    promoEndsOn,
    ...rest
  } = row;
  return {
    ...rest,
    image: toImageAsset({ imageId, imageFocusY, imageWidth, imageHeight }),
    promotion: isPromotion ? { startsOn: promoStartsOn, endsOn: promoEndsOn } : null,
  };
}

/** Same join contract as products: `leftJoin(images, eq(categories.imageId, images.id))`. */
export const categoryRowColumns = {
  id: categories.id,
  slug: categories.slug,
  name: categories.name,
  sortOrder: categories.sortOrder,
  imageId: categories.imageId,
  imageFocusY: categories.imageFocusY,
  imageWidth: images.width,
  imageHeight: images.height,
};

export type CategoryRow = Omit<Category, 'image'> & ImageColumns;

export function toCategory(row: CategoryRow): Category {
  const { imageId, imageFocusY, imageWidth, imageHeight, ...rest } = row;
  return { ...rest, image: toImageAsset({ imageId, imageFocusY, imageWidth, imageHeight }) };
}
