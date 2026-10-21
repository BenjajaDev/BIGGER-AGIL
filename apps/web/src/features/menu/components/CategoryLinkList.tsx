import type { MenuCategory } from '@bigger/shared';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { pluralize } from '../../../lib/format';
import styles from './CategoryLinkList.module.css';

export interface CategoryLinkListProps {
  categories: readonly MenuCategory[];
}

export function CategoryLinkList({ categories }: CategoryLinkListProps) {
  return (
    <ul role="list" className={styles.list}>
      {categories.map((category) => (
        <li key={category.id}>
          <Link to={`/carta/${category.slug}`} className={styles.link}>
            <span>
              <span className={styles.name}>{category.name}</span>
              <br />
              <span className={styles.count}>
                {pluralize(category.products.length, 'producto', 'productos')}
              </span>
            </span>
            <ChevronRight className={styles.chevron} size={24} aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
