import type { UploadedImage } from '@bigger/shared';
import { randomUUID } from 'node:crypto';
import { AppError } from '../../core/errors/app-error.js';
import { UnsupportedImageError, type ImageProcessor } from './image-processor.js';
import type { ImageStorage } from './image-storage.js';
import type { ImagesRepository } from './images.repository.js';

export class ImagesService {
  readonly #processor: ImageProcessor;
  readonly #storage: ImageStorage;
  readonly #repository: ImagesRepository;

  constructor(processor: ImageProcessor, storage: ImageStorage, repository: ImagesRepository) {
    this.#processor = processor;
    this.#storage = storage;
    this.#repository = repository;
  }

  async upload(input: Buffer): Promise<UploadedImage> {
    if (input.length === 0) {
      throw AppError.validation([{ path: 'file', message: 'Selecciona una foto JPG, PNG o WebP' }]);
    }
    let processed;
    try {
      processed = await this.#processor.process(input);
    } catch (error) {
      if (error instanceof UnsupportedImageError) {
        throw AppError.validation([{ path: 'file', message: error.message }]);
      }
      throw error;
    }

    const image = { id: randomUUID(), width: processed.width, height: processed.height };
    await this.#storage.save(image.id, processed.variants);
    await this.#repository.create(image);
    return image;
  }
}
