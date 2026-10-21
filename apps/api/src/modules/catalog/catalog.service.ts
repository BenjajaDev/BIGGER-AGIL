import type { Category, Menu, MenuProduct, ProductFilter } from '@bigger/shared';
import { toPublicMenuProduct } from './catalog-product.js';
import type { CatalogRepository } from './catalog.repository.js';

export class CatalogService {
  readonly #repository: CatalogRepository;

  constructor(repository: CatalogRepository) {
    this.#repository = repository;
  }

  listCategories(): Promise<Category[]> {
    return this.#repository.listCategories();
  }

  listProducts(filter: ProductFilter): Promise<MenuProduct[]> {
    return this.#repository.listProducts(filter);
  }

  /** Public menu: only what a customer can order, grouped by category, empty categories hidden. */
  async getPublicMenu(): Promise<Menu> {
    const [allCategories, availableProducts] = await Promise.all([
      this.#repository.listCategories(),
      this.#repository.listProducts({ onlyAvailable: true }),
    ]);

    const publicProducts = availableProducts
      .map(toPublicMenuProduct)
      .filter((product): product is MenuProduct => product !== null);

    const categoriesWithProducts = allCategories
      .map((category) => ({
        ...category,
        products: publicProducts.filter((product) => product.categoryId === category.id),
      }))
      .filter((category) => category.products.length > 0);

    return { categories: categoriesWithProducts };
  }
}
