import { ChevronLeft, SearchX } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { EmptyState } from '../../components/ui/EmptyState';
import { MenuCard } from './components/MenuCard';
import styles from './MenuPages.module.css';
import { useMenu } from './useMenu';

export function MenuCategoryPage() {
  const { categorySlug } = useParams();
  const menuQuery = useMenu();

  return (
    <AsyncContent query={menuQuery} loadingLabel="Cargando la carta…">
      {(menu) => {
        const category = menu.categories.find((candidate) => candidate.slug === categorySlug);
        if (!category) {
          return (
            <EmptyState
              icon={SearchX}
              title="No encontramos esta categoría"
              action={<Link to="/carta">Volver a la carta</Link>}
            />
          );
        }
        return (
          <section className={styles.section} aria-labelledby="categoria-titulo">
            <div className={styles.titleRow}>
              <Link to="/carta" className={styles.back} aria-label="Volver a la carta">
                <ChevronLeft size={24} aria-hidden="true" />
              </Link>
              <h1 id="categoria-titulo" className={styles.heading}>
                {category.name}
              </h1>
            </div>
            <ul role="list" className={styles.grid}>
              {category.products.map((product) => (
                <li key={product.id}>
                  <MenuCard product={product} headingLevel="h2" />
                </li>
              ))}
            </ul>
          </section>
        );
      }}
    </AsyncContent>
  );
}
