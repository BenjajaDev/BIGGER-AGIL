import type { MenuCategory } from '@bigger/shared';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { CoverImage } from '../../../components/ui/CoverImage';
import { pluralize } from '../../../lib/format';
import styles from './CategoryCard.module.css';

export function CategoryCard({ category }: { category: MenuCategory }) {
  return (
    <Link to={`/carta/${category.slug}`} className={styles.card}>
      <CoverImage
        image={category.image}
        ratio="2 / 1"
        sizes="(min-width: 64rem) 20vw, (min-width: 40rem) 33vw, 100vw"
      />
      <span className={styles.body}>
        <span>
          <span className={styles.name}>{category.name}</span>
          <br />
          <span className={styles.count}>
            {pluralize(category.products.length, 'producto', 'productos')}
          </span>
        </span>
        <ChevronRight className={styles.chevron} size={24} aria-hidden="true" />
      </span>
    </Link>
  );
}
