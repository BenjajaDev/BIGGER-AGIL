import type { Product } from '@bigger/shared';
import { formatClp, formatClpSpoken } from '../../../lib/format';
import { describeAllergens } from '../allergens';
import styles from './MenuProductCard.module.css';

export interface MenuProductCardProps {
  product: Pick<Product, 'id' | 'name' | 'description' | 'priceClp' | 'allergens'>;
  headingLevel?: 'h2' | 'h3';
}

/**
 * Linear reading order (name → price → description → allergens) so a screen reader
 * announces it exactly as it is seen, e.g. "Kuchen de frambuesa, 3.200 pesos".
 */
export function MenuProductCard({ product, headingLevel: Heading = 'h3' }: MenuProductCardProps) {
  return (
    <article className={styles.card} aria-labelledby={`producto-${product.id}`}>
      <div className={styles.header}>
        <Heading id={`producto-${product.id}`} className={styles.name}>
          {product.name}
        </Heading>
        <p className={styles.price}>
          <span aria-hidden="true">{formatClp(product.priceClp)}</span>
          <span className="visually-hidden">{formatClpSpoken(product.priceClp)}</span>
        </p>
      </div>
      {product.description && <p className={styles.description}>{product.description}</p>}
      <p className={styles.allergens}>{describeAllergens(product.allergens)}</p>
    </article>
  );
}
