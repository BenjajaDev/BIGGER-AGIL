import { startingPrice, type Product } from '@bigger/shared';
import { CircleSlash, Combine } from 'lucide-react';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { formatClp, formatClpSpoken } from '../../../lib/format';
import styles from './ProductTile.module.css';

export interface ProductTileProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export function ProductTile({ product, onAdd }: ProductTileProps) {
  const from = product.sizes.length > 1 ? 'desde ' : '';
  const price = startingPrice(product);
  const spokenLabel = product.isAvailable
    ? `Agregar ${product.name}, ${from}${formatClpSpoken(price)}`
    : `${product.name}, agotado`;

  return (
    <button
      type="button"
      className={styles.tile}
      disabled={!product.isAvailable}
      aria-label={spokenLabel}
      onClick={() => {
        onAdd(product);
      }}
    >
      <span className={styles.name}>{product.name}</span>
      <span className={styles.price}>
        {from}
        {formatClp(price)}
      </span>
      {product.kind === 'combo' && <StatusBadge tone="highlight" icon={Combine} label="Combo" />}
      {!product.isAvailable && <StatusBadge tone="neutral" icon={CircleSlash} label="Agotado" />}
    </button>
  );
}
