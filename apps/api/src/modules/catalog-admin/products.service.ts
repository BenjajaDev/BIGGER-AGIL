import type { AdminProduct, ApiFieldIssue, ProductInput } from '@bigger/shared';
import { AppError } from '../../core/errors/app-error.js';
import type { RealtimePublisher } from '../../realtime/event-hub.js';
import { customizationIssues, type CatalogLookups } from './catalog-lookups.js';
import type { ProductsAdminRepository } from './products.repository.js';
import { sameName } from './slugify.js';

const CATEGORY_ISSUES = {
  missing: 'La categoría no existe',
  archived: 'La categoría fue eliminada; restáurala o elige otra',
} as const;

export class ProductsAdminService {
  readonly #products: ProductsAdminRepository;
  readonly #lookups: CatalogLookups;
  readonly #publisher: RealtimePublisher;
  readonly #now: () => Date;

  constructor(
    products: ProductsAdminRepository,
    lookups: CatalogLookups,
    publisher: RealtimePublisher,
    now: () => Date = () => new Date(),
  ) {
    this.#products = products;
    this.#lookups = lookups;
    this.#publisher = publisher;
    this.#now = now;
  }

  list(includeArchived: boolean): Promise<AdminProduct[]> {
    return this.#products.list(includeArchived);
  }

  get(id: string): Promise<AdminProduct> {
    return this.#get(id);
  }

  async create(input: ProductInput): Promise<AdminProduct> {
    await this.#validate(input, null);
    const id = await this.#products.create(input);
    return this.#changed(id);
  }

  async update(id: string, input: ProductInput): Promise<AdminProduct> {
    const current = await this.#get(id);
    if (current.archivedAt !== null) {
      throw new AppError('CONFLICT', 'Restaura el producto antes de editarlo');
    }
    if (current.kind === 'single' && input.kind === 'combo') {
      await this.#assertNotInActiveCombos(current);
    }
    await this.#validate(input, id);
    await this.#products.update(id, input);
    return this.#changed(id);
  }

  /** "Eliminar" archives: the product leaves the menu, past comandas keep referencing it. */
  async archive(id: string): Promise<AdminProduct> {
    const product = await this.#get(id);
    if (product.archivedAt !== null) return product;
    await this.#assertNotInActiveCombos(product);
    await this.#products.setArchivedAt(id, this.#now());
    return this.#changed(id);
  }

  async restore(id: string): Promise<AdminProduct> {
    const product = await this.#get(id);
    if (product.archivedAt === null) return product;
    if ((await this.#products.categoryState(product.categoryId)) !== 'active') {
      throw new AppError('CONFLICT', 'Restaura primero su categoría');
    }
    await this.#assertNameIsFree(product.categoryId, product.name, id);
    await this.#products.setArchivedAt(id, null);
    return this.#changed(id);
  }

  async #get(id: string): Promise<AdminProduct> {
    const product = await this.#products.findById(id);
    if (!product) throw AppError.notFound('Producto');
    return product;
  }

  async #assertNotInActiveCombos(product: AdminProduct): Promise<void> {
    const combos = await this.#products.findActiveCombosIncluding(product.id);
    if (combos.length > 0) {
      const names = combos.map((combo) => `«${combo.name}»`).join(', ');
      throw new AppError(
        'CONFLICT',
        `«${product.name}» es parte de ${names}. Quítalo de esos combos primero.`,
      );
    }
  }

  async #validate(input: ProductInput, productId: string | null): Promise<void> {
    const issues: ApiFieldIssue[] = [];

    const categoryState = await this.#products.categoryState(input.categoryId);
    if (categoryState !== 'active') {
      issues.push({ path: 'categoryId', message: CATEGORY_ISSUES[categoryState] });
    }

    if (input.typeId && (await this.#lookups.existingTypeIds([input.typeId])).length === 0) {
      issues.push({ path: 'typeId', message: 'El tipo de producto ya no existe' });
    }
    if (input.image && (await this.#lookups.existingImageIds([input.image.imageId])).length === 0) {
      issues.push({ path: 'image.imageId', message: 'La foto ya no existe; súbela de nuevo' });
    }

    if (input.kind === 'single') {
      issues.push(...(await customizationIssues(this.#lookups, input)));
    } else {
      issues.push(...(await this.#comboIssues(input.comboSlots, productId)));
    }

    if (issues.length > 0) throw AppError.validation(issues);
    await this.#assertNameIsFree(input.categoryId, input.name, productId);
  }

  async #comboIssues(
    slots: Extract<ProductInput, { kind: 'combo' }>['comboSlots'],
    comboId: string | null,
  ): Promise<ApiFieldIssue[]> {
    const optionIds = slots.flatMap((slot) => slot.options.map((option) => option.productId));
    const references = new Map(
      (await this.#products.findReferences(optionIds)).map((reference) => [
        reference.id,
        reference,
      ]),
    );

    return slots.flatMap((slot, slotIndex) =>
      slot.options.flatMap((option, optionIndex): ApiFieldIssue[] => {
        const path = `comboSlots.${slotIndex}.options.${optionIndex}.productId`;
        const reference = references.get(option.productId);
        if (!reference || reference.archivedAt !== null) {
          return [{ path, message: 'El producto ya no existe' }];
        }
        if (reference.id === comboId) {
          return [{ path, message: 'Un combo no puede incluirse a sí mismo' }];
        }
        if (reference.kind === 'combo') {
          return [{ path, message: 'Un combo no puede incluir otro combo' }];
        }
        return [];
      }),
    );
  }

  async #assertNameIsFree(
    categoryId: string,
    name: string,
    excludeId: string | null,
  ): Promise<void> {
    const siblings = await this.#products.listActiveInCategory(categoryId);
    if (siblings.some((sibling) => sibling.id !== excludeId && sameName(sibling.name, name))) {
      throw new AppError('CONFLICT', `Ya existe «${name.trim()}» en esta categoría`);
    }
  }

  async #changed(id: string): Promise<AdminProduct> {
    this.#publisher.publish({ type: 'catalog.updated' });
    return this.#get(id);
  }
}
