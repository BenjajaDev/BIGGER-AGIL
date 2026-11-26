import { startingPrice, type Product } from '@bigger/shared';
import { CircleSlash, Combine, Plus, Tag } from 'lucide-react';
import { coverMotif } from '../../../components/ui/cover-motif';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { cx } from '../../../lib/cx';
import { formatClp, formatClpSpoken } from '../../../lib/format';
import styles from './ProductTile.module.css';

export interface ProductTileProps {
  product: Product;
  /** Name of the product's category: it picks the illustration when the product name does not. */
  categoryName?: string | undefined;
  /** Units of this product already in the comanda. */
  inComanda?: number;
  onAdd: (product: Product) => void;
}

function motifFor(productName: string, categoryName: string | undefined) {
  const byName = coverMotif(productName);
  const fallback = coverMotif(undefined);
  if (byName.icon !== fallback.icon || categoryName === undefined) return byName;
  return coverMotif(categoryName);
}

export function ProductTile({ product, categoryName, inComanda = 0, onAdd }: ProductTileProps) {
  const from = product.sizes.length > 1 ? 'desde ' : '';
  const price = startingPrice(product);
  const { icon: Icon, tone } = motifFor(product.name, categoryName);
  const spokenLabel = product.isAvailable
    ? `Agregar ${product.name}, ${from}${formatClpSpoken(price)}${inComanda > 0 ? `, ${String(inComanda)} en la comanda` : ''}`
    : `${product.name}, agotado`;

  return (
    <button
      type="button"
      className={cx(styles.tile, inComanda > 0 && styles.selected)}
      disabled={!product.isAvailable}
      aria-label={spokenLabel}
      onClick={() => {
        onAdd(product);
      }}
    >
      <span className={styles.top}>
        <span className={cx(styles.motif, styles[tone])}>
          <Icon size={22} aria-hidden="true" />
        </span>
        {inComanda > 0 && (
          <span className={styles.qty} aria-hidden="true">
            ×{inComanda}
          </span>
        )}
      </span>
      <span className={styles.name}>{product.name}</span>
      {(product.promotion?.discountPercent ?? 0) > 0 && (
        <StatusBadge
          tone="success"
          icon={Tag}
          label={`−${String(product.promotion?.discountPercent)} %`}
        />
      )}
      {product.kind === 'combo' && <StatusBadge tone="highlight" icon={Combine} label="Combo" />}
      {!product.isAvailable && <StatusBadge tone="neutral" icon={CircleSlash} label="Agotado" />}
      <span className={styles.bottom}>
        <span className={styles.price}>
          {from && <span className={styles.from}>{from}</span>}
          {formatClp(price)}
        </span>
        {product.isAvailable && (
          <span className={styles.plus}>
            <Plus size={20} strokeWidth={2.5} aria-hidden="true" />
          </span>
        )}
      </span>
    </button>
  );
}
