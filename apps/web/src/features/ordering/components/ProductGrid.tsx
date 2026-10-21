import type { Product } from '@bigger/shared';
import { ProductTile } from './ProductTile';
import styles from './ProductGrid.module.css';

export interface ProductGridProps {
  products: readonly Product[];
  onAdd: (product: Product) => void;
}

export function ProductGrid({ products, onAdd }: ProductGridProps) {
  return (
    <ul role="list" className={styles.grid}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductTile product={product} onAdd={onAdd} />
        </li>
      ))}
    </ul>
  );
}
