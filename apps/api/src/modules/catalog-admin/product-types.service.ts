import type { ProductType, ProductTypeInput } from '@bigger/shared';
import { AppError } from '../../core/errors/app-error.js';
import { customizationIssues, type CatalogLookups } from './catalog-lookups.js';
import type { ProductTypesRepository } from './product-types.repository.js';
import { sameName } from './slugify.js';

export class ProductTypesService {
  readonly #repository: ProductTypesRepository;
  readonly #lookups: CatalogLookups;

  constructor(repository: ProductTypesRepository, lookups: CatalogLookups) {
    this.#repository = repository;
    this.#lookups = lookups;
  }

  /**
   * Templates whose groups were deleted later still load: stale group ids and their size rules
   * are dropped so a new product is never pre-filled with something that no longer exists.
   */
  async list(): Promise<ProductType[]> {
    const types = await this.#repository.list();
    const existing = await this.#lookups.modifierGroupOptionCounts([
      ...new Set(types.flatMap((type) => type.modifierGroupIds)),
    ]);
    return types.map((type) => ({
      ...type,
      modifierGroupIds: type.modifierGroupIds.filter((groupId) => existing.has(groupId)),
      sizes: type.sizes.map((size) => ({
        ...size,
        groupRules: size.groupRules.filter((rule) => existing.has(rule.groupId)),
      })),
    }));
  }

  async get(id: string): Promise<ProductType> {
    const type = (await this.list()).find((candidate) => candidate.id === id);
    if (!type) throw AppError.notFound('Tipo de producto');
    return type;
  }

  async create(input: ProductTypeInput): Promise<ProductType> {
    await this.#validate(input, null);
    return this.get(await this.#repository.create(input));
  }

  async update(id: string, input: ProductTypeInput): Promise<ProductType> {
    await this.get(id);
    await this.#validate(input, id);
    await this.#repository.update(id, input);
    return this.get(id);
  }

  async delete(id: string): Promise<ProductType> {
    const type = await this.get(id);
    await this.#repository.delete(id);
    return type;
  }

  async #validate(input: ProductTypeInput, excludeId: string | null): Promise<void> {
    const issues = await customizationIssues(this.#lookups, input);
    if (issues.length > 0) throw AppError.validation(issues);
    const types = await this.#repository.list();
    if (types.some((type) => type.id !== excludeId && sameName(type.name, input.name))) {
      throw new AppError('CONFLICT', `Ya existe el tipo «${input.name.trim()}»`);
    }
  }
}
