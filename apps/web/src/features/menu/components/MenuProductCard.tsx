import type { MenuProduct } from '@bigger/shared';
import { formatClp, formatClpSpoken } from '../../../lib/format';
import { describeAllergens } from '../allergens';
import { describeComboSlot, describeModifierGroup } from '../menu-details';
import styles from './MenuProductCard.module.css';

export interface MenuProductCardProps {
  product: Pick<
    MenuProduct,
    'id' | 'name' | 'description' | 'priceClp' | 'allergens' | 'comboSlots' | 'modifierGroups'
  >;
  headingLevel?: 'h2' | 'h3';
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className={styles.details}>
      <p className={styles.detailsTitle}>{title}</p>
      <ul className={styles.detailsList}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Linear reading order (name → price → description → what it includes or how to customize it →
 * allergens) so a screen reader announces it exactly as it is seen.
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
      <DetailList title="Incluye" items={product.comboSlots.map(describeComboSlot)} />
      <DetailList title="Puedes elegir" items={product.modifierGroups.map(describeModifierGroup)} />
      <p className={styles.allergens}>{describeAllergens(product.allergens)}</p>
    </article>
  );
}
