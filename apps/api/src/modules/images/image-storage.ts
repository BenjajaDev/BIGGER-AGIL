import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ImageVariantName } from './image-processor.js';

/** Port: where processed images live. Swapping to cloud storage only replaces this adapter. */
export interface ImageStorage {
  save: (imageId: string, variants: { name: ImageVariantName; data: Buffer }[]) => Promise<void>;
}

export function imageFileName(imageId: string, variant: ImageVariantName): string {
  return `${imageId}-${variant}.webp`;
}

export class LocalImageStorage implements ImageStorage {
  readonly #directory: string;

  constructor(directory: string) {
    this.#directory = directory;
  }

  async save(imageId: string, variants: { name: ImageVariantName; data: Buffer }[]): Promise<void> {
    await mkdir(this.#directory, { recursive: true });
    // Names are built from a server-generated UUID only: no user input reaches the path.
    await Promise.all(
      variants.map(({ name, data }) =>
        writeFile(join(this.#directory, imageFileName(imageId, name)), data, { flag: 'wx' }),
      ),
    );
  }
}
