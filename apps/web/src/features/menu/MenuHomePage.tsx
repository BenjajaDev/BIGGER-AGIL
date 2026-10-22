import type { MenuProduct } from '@bigger/shared';
import { SearchX } from 'lucide-react';
import { useDeferredValue, useId, useState } from 'react';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { EmptyState } from '../../components/ui/EmptyState';
import { pluralize } from '../../lib/format';
import { CategoryCard } from './components/CategoryCard';
import { MenuCard } from './components/MenuCard';
import styles from './MenuPages.module.css';
import { searchMenu } from './search-menu';
import { useMenu } from './useMenu';

function CardGrid({ products }: { products: readonly MenuProduct[] }) {
  return (
    <ul role="list" className={styles.grid}>
      {products.map((product) => (
        <li key={product.id}>
          <MenuCard product={product} />
        </li>
      ))}
    </ul>
  );
}

export function MenuHomePage() {
  const menuQuery = useMenu();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const searchId = useId();

  return (
    <>
      <div className={styles.search}>
        <label htmlFor={searchId} className={styles.searchLabel}>
          Buscar un producto
        </label>
        <input
          id={searchId}
          type="search"
          className={styles.searchInput}
          value={search}
          autoComplete="off"
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
      </div>

      <AsyncContent query={menuQuery} loadingLabel="Cargando la carta…">
        {(menu) => {
          if (deferredSearch.trim() !== '') {
            const results = searchMenu(menu, deferredSearch);
            return (
              <section className={styles.section} aria-labelledby="resultados-titulo">
                <h1 id="resultados-titulo" className={styles.heading}>
                  Resultados
                </h1>
                <p role="status" className={styles.status}>
                  {pluralize(results.length, 'producto encontrado', 'productos encontrados')}
                </p>
                {results.length === 0 ? (
                  <EmptyState icon={SearchX} title="No encontramos ese producto" />
                ) : (
                  <CardGrid products={results} />
                )}
              </section>
            );
          }
          return (
            <>
              <h1 className="visually-hidden">Carta de BIGGER</h1>
              {menu.promotions.length > 0 && (
                <section className={styles.section} aria-labelledby="promociones-titulo">
                  <h2 id="promociones-titulo" className={styles.heading}>
                    Promociones
                  </h2>
                  <CardGrid products={menu.promotions} />
                </section>
              )}
              <section className={styles.section} aria-labelledby="categorias-titulo">
                <h2 id="categorias-titulo" className={styles.heading}>
                  ¿Qué te gustaría?
                </h2>
                <ul role="list" className={styles.categoryGrid}>
                  {menu.categories.map((category) => (
                    <li key={category.id}>
                      <CategoryCard category={category} />
                    </li>
                  ))}
                </ul>
              </section>
            </>
          );
        }}
      </AsyncContent>
    </>
  );
}
