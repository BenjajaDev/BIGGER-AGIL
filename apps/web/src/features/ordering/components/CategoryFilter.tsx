import type { Category } from '@bigger/shared';
import { Chip } from '../../../components/ui/Chip';
import { categoryIcon } from '../category-icon';
import styles from './CategoryFilter.module.css';

export interface CategoryFilterProps {
  categories: readonly Category[];
  selectedId: string | null;
  onSelect: (categoryId: string) => void;
}

export function CategoryFilter({ categories, selectedId, onSelect }: CategoryFilterProps) {
  return (
    <ul role="list" className={styles.list} aria-label="Categorías">
      {categories.map((category) => {
        const Icon = categoryIcon(category.slug);
        return (
          <li key={category.id}>
            <Chip
              pressed={category.id === selectedId}
              onClick={() => {
                onSelect(category.id);
              }}
            >
              <Icon size={18} aria-hidden="true" />
              {category.name}
            </Chip>
          </li>
        );
      })}
    </ul>
  );
}
