import type { Product } from '@bigger/shared';
import { ProductTile } from './ProductTile';
import styles from './ProductGrid.module.css';

export interface ProductGridProps {
  products: readonly Product[];
  categoryNames?: ReadonlyMap<string, string>;
  /** Units already in the comanda, by product id. */
  quantities?: ReadonlyMap<string, number>;
  onAdd: (product: Product) => void;
}

export function ProductGrid({ products, categoryNames, quantities, onAdd }: ProductGridProps) {
  return (
    <ul role="list" className={styles.grid}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductTile
            product={product}
            categoryName={product.categoryId ? categoryNames?.get(product.categoryId) : undefined}
            inComanda={quantities?.get(product.id) ?? 0}
            onAdd={onAdd}
          />
        </li>
      ))}
    </ul>
  );
}
