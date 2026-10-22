import sharp from 'sharp';

export type ImageVariantName = 'card' | 'thumb';

export interface ProcessedImage {
  width: number;
  height: number;
  variants: { name: ImageVariantName; data: Buffer }[];
}

/** Port: turns an untrusted upload into the web-ready files the menu serves. */
export interface ImageProcessor {
  process: (input: Buffer) => Promise<ProcessedImage>;
}

const SUPPORTED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const VARIANT_WIDTHS: Readonly<Record<ImageVariantName, number>> = { card: 1200, thumb: 480 };
/** ~40 MP: real photos fit, decompression bombs do not. */
const MAX_INPUT_PIXELS = 40_000_000;

export class UnsupportedImageError extends Error {}

/**
 * Re-encodes every upload instead of storing the original: the format is sniffed from the bytes
 * (not the declared content type), EXIF orientation is applied and all metadata (GPS included)
 * is dropped because sharp does not copy it unless asked to.
 */
export class SharpImageProcessor implements ImageProcessor {
  async process(input: Buffer): Promise<ProcessedImage> {
    let format: string | undefined;
    try {
      ({ format } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata());
    } catch {
      throw new UnsupportedImageError('El archivo no es una imagen válida');
    }
    if (!format || !SUPPORTED_FORMATS.has(format)) {
      throw new UnsupportedImageError('Formato no soportado: usa una foto JPG, PNG o WebP');
    }

    const variants = await Promise.all(
      (Object.entries(VARIANT_WIDTHS) as [ImageVariantName, number][]).map(
        async ([name, width]) => {
          const { data, info } = await sharp(input, {
            limitInputPixels: MAX_INPUT_PIXELS,
            failOn: 'error',
          })
            .rotate()
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer({ resolveWithObject: true });
          return { name, data, info };
        },
      ),
    );

    const card = variants.find((variant) => variant.name === 'card');
    if (!card) throw new Error('Falta la variante principal de la imagen');
    return {
      width: card.info.width,
      height: card.info.height,
      variants: variants.map(({ name, data }) => ({ name, data })),
    };
  }
}
