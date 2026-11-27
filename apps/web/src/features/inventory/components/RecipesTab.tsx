import type { Recipe, Supply } from '@bigger/shared';
import { BookOpen } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useAdminProducts } from '../../catalog-admin/useCatalogAdmin';
import { formatQuantity } from '../supply-text';
import { ListRow } from './ListRow';
import styles from './Lists.module.css';
import { RecipeSheet, type RecipeTarget } from './RecipeSheet';

export function RecipesTab({
  supplies,
  recipes,
}: {
  supplies: readonly Supply[];
  recipes: readonly Recipe[];
}) {
  const products = useAdminProducts(false);
  const [target, setTarget] = useState<RecipeTarget | null>(null);
  const singles = (products.data ?? [])
    .filter((product) => product.kind === 'single')
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const recipeOf = (productId: string) =>
    recipes.find((recipe) => recipe.productId === productId) ?? null;

  return (
    <div className={styles.stack}>
      <p className={styles.hint}>
        Define qué insumos usa cada producto: al venderlo, el stock baja solo.
      </p>
      {singles.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Todavía no hay productos"
          description="Crea productos en Configuración para definir sus recetas."
        />
      ) : (
        <ul role="list" className={styles.rows} aria-label="Recetas por producto">
          {singles.map((product) => {
            const recipe = recipeOf(product.id);
            const count = recipe?.lines.length ?? 0;
            return (
              <ListRow
                key={product.id}
                title={product.name}
                meta={
                  count === 0
                    ? 'Sin receta'
                    : `${String(count)} ${count === 1 ? 'insumo' : 'insumos'}`
                }
                label={`${product.name}, ${count === 0 ? 'sin receta' : `${String(count)} insumos`}. Editar receta`}
                extra={
                  recipe && count > 0 ? (
                    <ul role="list" className={styles.chips}>
                      {recipe.lines.map((line) => {
                        const supply = supplies.find((s) => s.id === line.supplyId);
                        return (
                          <li key={line.supplyId} className={styles.chip}>
                            {supply ? formatQuantity(line.quantity, supply.unit) : line.quantity}{' '}
                            {supply?.name ?? '—'}
                          </li>
                        );
                      })}
                    </ul>
                  ) : undefined
                }
                onOpen={() => {
                  setTarget({ productId: product.id, productName: product.name });
                }}
              />
            );
          })}
        </ul>
      )}
      <RecipeSheet
        target={target}
        recipe={target ? recipeOf(target.productId) : null}
        supplies={supplies}
        onClose={() => {
          setTarget(null);
        }}
      />
    </div>
  );
}
