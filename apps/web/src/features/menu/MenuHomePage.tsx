import { SearchX } from 'lucide-react';
import { useDeferredValue, useId, useState } from 'react';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { EmptyState } from '../../components/ui/EmptyState';
import { pluralize } from '../../lib/format';
import { CategoryLinkList } from './components/CategoryLinkList';
import { MenuProductCard } from './components/MenuProductCard';
import styles from './MenuPages.module.css';
import { searchMenu } from './search-menu';
import { useMenu } from './useMenu';

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
          if (deferredSearch.trim() === '') {
            return (
              <>
                <h1 className={styles.heading}>¿Qué te gustaría?</h1>
                <CategoryLinkList categories={menu.categories} />
              </>
            );
          }
          const results = searchMenu(menu, deferredSearch);
          return (
            <section className={styles.results} aria-labelledby="resultados-titulo">
              <h1 id="resultados-titulo" className={styles.heading}>
                Resultados
              </h1>
              <p role="status" className={styles.status}>
                {pluralize(results.length, 'producto encontrado', 'productos encontrados')}
              </p>
              {results.length === 0 ? (
                <EmptyState icon={SearchX} title="No encontramos ese producto" />
              ) : (
                results.map((product) => (
                  <MenuProductCard key={product.id} product={product} headingLevel="h2" />
                ))
              )}
            </section>
          );
        }}
      </AsyncContent>
    </>
  );
}
