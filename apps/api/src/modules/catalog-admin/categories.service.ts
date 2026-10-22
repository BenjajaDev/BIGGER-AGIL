import type { AdminCategory, CategoryInput } from '@bigger/shared';
import { AppError } from '../../core/errors/app-error.js';
import type { RealtimePublisher } from '../../realtime/event-hub.js';
import type { CatalogLookups } from './catalog-lookups.js';
import type { CategoriesAdminRepository } from './categories.repository.js';
import { sameName, slugify } from './slugify.js';

export class CategoriesAdminService {
  readonly #repository: CategoriesAdminRepository;
  readonly #lookups: CatalogLookups;
  readonly #publisher: RealtimePublisher;
  readonly #now: () => Date;

  constructor(
    repository: CategoriesAdminRepository,
    lookups: CatalogLookups,
    publisher: RealtimePublisher,
    now: () => Date = () => new Date(),
  ) {
    this.#repository = repository;
    this.#lookups = lookups;
    this.#publisher = publisher;
    this.#now = now;
  }

  list(includeArchived: boolean): Promise<AdminCategory[]> {
    return this.#repository.list(includeArchived);
  }

  async create(input: CategoryInput): Promise<AdminCategory> {
    await this.#assertImageExists(input);
    await this.#assertNameIsFree(input.name, null);
    const id = await this.#repository.create({
      ...input,
      slug: await this.#uniqueSlug(input.name),
    });
    return this.#changed(id);
  }

  /** Renames and/or changes the picture; the slug (used in /carta URLs and QR codes) is kept. */
  async update(id: string, input: CategoryInput): Promise<AdminCategory> {
    await this.#get(id);
    await this.#assertImageExists(input);
    await this.#assertNameIsFree(input.name, id);
    await this.#repository.update(id, input);
    return this.#changed(id);
  }

  async #assertImageExists({ image }: CategoryInput): Promise<void> {
    if (image && (await this.#lookups.existingImageIds([image.imageId])).length === 0) {
      throw AppError.validation([
        { path: 'image.imageId', message: 'La foto ya no existe; súbela de nuevo' },
      ]);
    }
  }

  async archive(id: string): Promise<AdminCategory> {
    const category = await this.#get(id);
    if (category.archivedAt !== null) return category;
    if (category.activeProductCount > 0) {
      throw new AppError(
        'CONFLICT',
        `«${category.name}» todavía tiene ${category.activeProductCount} producto(s). Muévelos a otra categoría o elimínalos primero.`,
      );
    }
    await this.#repository.setArchivedAt(id, this.#now());
    return this.#changed(id);
  }

  async restore(id: string): Promise<AdminCategory> {
    const category = await this.#get(id);
    if (category.archivedAt === null) return category;
    await this.#assertNameIsFree(category.name, id);
    await this.#repository.setArchivedAt(id, null);
    return this.#changed(id);
  }

  async #get(id: string): Promise<AdminCategory> {
    const category = await this.#repository.findById(id);
    if (!category) throw AppError.notFound('Categoría');
    return category;
  }

  async #assertNameIsFree(name: string, excludeId: string | null): Promise<void> {
    const records = await this.#repository.listRecords();
    const clash = records.find(
      (record) =>
        record.id !== excludeId && record.archivedAt === null && sameName(record.name, name),
    );
    if (clash) throw new AppError('CONFLICT', `Ya existe la categoría «${clash.name}»`);
  }

  async #uniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    for (let suffix = 2; await this.#repository.slugExists(candidate); suffix += 1) {
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }

  async #changed(id: string): Promise<AdminCategory> {
    this.#publisher.publish({ type: 'catalog.updated' });
    return this.#get(id);
  }
}
