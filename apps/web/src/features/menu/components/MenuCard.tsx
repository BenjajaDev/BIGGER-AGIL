import type { MenuProduct } from '@bigger/shared';
import { Sparkles } from 'lucide-react';
import { useId } from 'react';
import { CoverImage } from '../../../components/ui/CoverImage';
import { formatClp, formatClpSpoken } from '../../../lib/format';
import { describeAllergens } from '../allergens';
import {
  describeComboSlot,
  describeModifierGroup,
  describePrice,
  describeSizeRules,
} from '../menu-details';
import styles from './MenuCard.module.css';

export type MenuCardProduct = Pick<
  MenuProduct,
  | 'name'
  | 'subtitle'
  | 'description'
  | 'priceClp'
  | 'allergens'
  | 'image'
  | 'sizes'
  | 'promotion'
  | 'modifierGroups'
  | 'comboSlots'
>;

export interface MenuCardProps {
  product: MenuCardProduct;
  headingLevel?: 'h2' | 'h3';
  /** Local object URL shown while a new photo uploads (admin preview). */
  previewImageSrc?: string;
}

function Block({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className={styles.block}>
      <p className={styles.blockTitle}>{title}</p>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Standard menu card: (1) image header, (2) title and subtitle, (3) sizes with their prices and
 * rules, (4) ingredients, extras and combo choices. The DOM follows that visual order so a screen
 * reader announces it the same way: "Arma tu ensalada, desde 2.500 pesos…".
 */
export function MenuCard({
  product,
  headingLevel: Heading = 'h3',
  previewImageSrc,
}: MenuCardProps) {
  const titleId = useId();
  const price = describePrice(product);
  const hasSizes = product.sizes.length > 0;

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={styles.media}>
        <CoverImage
          image={product.image}
          {...(previewImageSrc ? { previewSrc: previewImageSrc } : {})}
        />
        {product.promotion && (
          <span className={styles.ribbon}>
            <Sparkles size={14} aria-hidden="true" />
            Promoción
          </span>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.titles}>
          <Heading id={titleId} className={styles.name}>
            {product.name}
          </Heading>
          {product.subtitle && <p className={styles.subtitle}>{product.subtitle}</p>}
        </div>
        <p className={styles.price}>
          <span aria-hidden="true">{price.visual}</span>
          <span className="visually-hidden">{price.spoken}</span>
        </p>
        {product.description && <p className={styles.description}>{product.description}</p>}

        {hasSizes && (
          <div className={styles.block}>
            <p className={styles.blockTitle}>Tamaños</p>
            <ul role="list" className={styles.sizes}>
              {product.sizes.map((size) => {
                const rules = describeSizeRules(product.modifierGroups, size);
                return (
                  <li key={size.id} className={styles.size}>
                    <span className={styles.sizeName}>{size.name}</span>
                    <span className={styles.sizePrice}>
                      <span aria-hidden="true">{formatClp(size.priceClp)}</span>
                      <span className="visually-hidden">{formatClpSpoken(size.priceClp)}</span>
                    </span>
                    {rules && <span className={styles.sizeRules}>{rules}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <Block title="Incluye" items={product.comboSlots.map(describeComboSlot)} />
        <Block
          title={hasSizes ? 'Ingredientes a elección' : 'Extras y opciones'}
          items={product.modifierGroups.map((group) => describeModifierGroup(group, hasSizes))}
        />
        <p className={styles.allergens}>{describeAllergens(product.allergens)}</p>
      </div>
    </article>
  );
}
