import {
  calendarDate,
  isPromotionActive,
  withPromotionPrices,
  type Category,
  type Menu,
  type MenuProduct,
  type ProductFilter,
} from '@bigger/shared';
import { toPublicMenuProduct } from './catalog-product.js';
import type { CatalogRepository } from './catalog.repository.js';

export interface CatalogClock {
  /** IANA time zone of the shop, used to decide which promotions run today. */
  timeZone: string;
  now: () => Date;
}

export class CatalogService {
  readonly #repository: CatalogRepository;
  readonly #clock: CatalogClock;

  constructor(repository: CatalogRepository, clock: CatalogClock) {
    this.#repository = repository;
    this.#clock = clock;
  }

  listCategories(): Promise<Category[]> {
    return this.#repository.listCategories();
  }

  /** Sale prices: a running promotion's discount is already applied to the prices returned. */
  async listProducts(filter: ProductFilter): Promise<MenuProduct[]> {
    const today = calendarDate(this.#clock.now(), this.#clock.timeZone);
    const products = await this.#repository.listProducts(filter);
    return products.map((product) => withPromotionPrices(product, today));
  }

  /**
   * Public menu: only what a customer can order, grouped by category, empty categories hidden,
   * and the promotions running today (in the shop's time zone) listed first.
   */
  async getPublicMenu(): Promise<Menu> {
    const [allCategories, availableProducts] = await Promise.all([
      this.#repository.listCategories(),
      this.#repository.listProducts({ onlyAvailable: true }),
    ]);

    const today = calendarDate(this.#clock.now(), this.#clock.timeZone);
    const publicProducts = availableProducts
      .map((product) => toPublicMenuProduct(product, (p) => isPromotionActive(p.promotion, today)))
      .map((product) => (product ? withPromotionPrices(product, today) : product))
      .filter((product): product is MenuProduct => product !== null);

    const categoriesWithProducts = allCategories
      .map((category) => ({
        ...category,
        products: publicProducts.filter((product) => product.categoryId === category.id),
      }))
      .filter((category) => category.products.length > 0);

    return {
      promotions: publicProducts.filter((product) => product.promotion !== null),
      categories: categoriesWithProducts,
    };
  }
}
