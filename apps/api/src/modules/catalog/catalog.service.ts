import type { Category, Menu, Product, ProductFilter } from '@bigger/shared';
import type { CatalogRepository } from './catalog.repository.js';

export class CatalogService {
  readonly #repository: CatalogRepository;

  constructor(repository: CatalogRepository) {
    this.#repository = repository;
  }

  listCategories(): Promise<Category[]> {
    return this.#repository.listCategories();
  }

  listProducts(filter: ProductFilter): Promise<Product[]> {
    return this.#repository.listProducts(filter);
  }

  /** Public menu: only available products, grouped by category, empty categories hidden. */
  async getPublicMenu(): Promise<Menu> {
    const [allCategories, availableProducts] = await Promise.all([
      this.#repository.listCategories(),
      this.#repository.listProducts({ onlyAvailable: true }),
    ]);

    const categoriesWithProducts = allCategories
      .map((category) => ({
        ...category,
        products: availableProducts.filter((product) => product.categoryId === category.id),
      }))
      .filter((category) => category.products.length > 0);

    return { categories: categoriesWithProducts };
  }
}
