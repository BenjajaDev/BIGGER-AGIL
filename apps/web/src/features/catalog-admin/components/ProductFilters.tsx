import type { AdminCategory } from '@bigger/shared';
import { Search } from 'lucide-react';
import { Chip } from '../../../components/ui/Chip';
import {
  PRODUCT_STATUS_FILTERS,
  PRODUCT_STATUS_LABELS,
  type ProductFilter,
} from '../product-filter';
import styles from './ProductFilters.module.css';

export interface ProductFiltersProps {
  filter: ProductFilter;
  categories: readonly AdminCategory[];
  shown: number;
  total: number;
  onChange: (filter: ProductFilter) => void;
}

export function ProductFilters({
  filter,
  categories,
  shown,
  total,
  onChange,
}: ProductFiltersProps) {
  return (
    <div className={styles.filters}>
      <label className={styles.search}>
        <span className="visually-hidden">Buscar producto</span>
        <Search size={20} aria-hidden="true" className={styles.icon} />
        <input
          type="search"
          placeholder="Buscar producto"
          value={filter.query}
          className={styles.input}
          onChange={(event) => {
            onChange({ ...filter, query: event.target.value });
          }}
        />
      </label>

      <div role="group" aria-label="Filtrar por categoría" className={styles.chips}>
        <Chip
          pressed={filter.categoryId === null}
          onClick={() => {
            onChange({ ...filter, categoryId: null });
          }}
        >
          Todas las categorías
        </Chip>
        {categories.map((category) => (
          <Chip
            key={category.id}
            pressed={filter.categoryId === category.id}
            onClick={() => {
              onChange({ ...filter, categoryId: category.id });
            }}
          >
            {category.name}
          </Chip>
        ))}
      </div>

      <div role="group" aria-label="Filtrar por estado" className={styles.chips}>
        {PRODUCT_STATUS_FILTERS.map((status) => (
          <Chip
            key={status}
            pressed={filter.status === status}
            onClick={() => {
              onChange({ ...filter, status });
            }}
          >
            {PRODUCT_STATUS_LABELS[status]}
          </Chip>
        ))}
      </div>

      <p role="status" className={styles.count}>
        Mostrando {shown} de {total}
      </p>
    </div>
  );
}
