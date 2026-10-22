import type { ImageAsset } from '@bigger/shared';
import { buildApiUrl } from '../services/http-client';

export type ImageVariant = 'card' | 'thumb';

/** Width of each variant the API generates; used to build `srcset`. */
const VARIANT_WIDTHS: Readonly<Record<ImageVariant, number>> = { thumb: 480, card: 1200 };

export function imageUrl(imageId: string, variant: ImageVariant): string {
  return buildApiUrl(`/media/${imageId}-${variant}.webp`);
}

export function imageSrcSet(imageId: string): string {
  return (Object.entries(VARIANT_WIDTHS) as [ImageVariant, number][])
    .map(([variant, width]) => `${imageUrl(imageId, variant)} ${width}w`)
    .join(', ');
}

/** CSS `object-position` keeping the chosen vertical framing when the image is cropped. */
export function focusPosition(image: Pick<ImageAsset, 'focusY'>): string {
  return `50% ${image.focusY}%`;
}
