import type { AppDatabase } from '../../db/client.js';
import { images } from '../../db/schema.js';

export interface ImagesRepository {
  create: (image: { id: string; width: number; height: number }) => Promise<void>;
}

export class DrizzleImagesRepository implements ImagesRepository {
  readonly #db: AppDatabase;

  constructor(db: AppDatabase) {
    this.#db = db;
  }

  async create(image: { id: string; width: number; height: number }): Promise<void> {
    await this.#db.insert(images).values(image);
  }
}
