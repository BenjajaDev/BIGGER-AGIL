import type { Recipe, Supply } from '@bigger/shared';
import { BookOpen, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Field } from '../../../components/form/Field';
import { controlClassName } from '../../../components/form/control';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { useAdminProducts } from '../../catalog-admin/useCatalogAdmin';
import { useSetRecipe } from '../useInventory';
import styles from './Inventory.module.css';

interface Line {
  supplyId: string;
  quantity: string;
}

export function RecipesTab({
  supplies,
  recipes,
}: {
  supplies: readonly Supply[];
  recipes: readonly Recipe[];
}) {
  const products = useAdminProducts(false);
  const save = useSetRecipe();
  const [productId, setProductId] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const singles = (products.data ?? []).filter((product) => product.kind === 'single');

  const choose = (id: string) => {
    setProductId(id);
    const existing = recipes.find((recipe) => recipe.productId === id);
    setLines(
      (existing?.lines ?? []).map((line) => ({
        supplyId: line.supplyId,
        quantity: String(line.quantity),
      })),
    );
  };

  return (
    <div className={styles.stack}>
      <Card as="section" aria-labelledby="receta-titulo" className={styles.formCard}>
        <SectionHeader
          id="receta-titulo"
          title="Receta de un producto"
          level={3}
          description="Define qué insumos usa una unidad de cada producto: al venderlo, el stock baja solo."
        />
        <div className={styles.form}>
          <Field label="Producto">
            {(control) => (
              <select
                {...control}
                className={controlClassName}
                value={productId}
                onChange={(e) => {
                  choose(e.target.value);
                }}
              >
                <option value="">Elige un producto</option>
                {singles.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                    {recipes.some((recipe) => recipe.productId === product.id) ? ' ✓' : ''}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {productId !== '' && (
            <>
              {lines.map((line, index) => (
                <div key={`${line.supplyId}-${String(index)}`} className={styles.lineRow}>
                  <select
                    className={controlClassName}
                    aria-label={`Insumo ${String(index + 1)}`}
                    value={line.supplyId}
                    onChange={(e) => {
                      setLines(
                        lines.map((l, i) => (i === index ? { ...l, supplyId: e.target.value } : l)),
                      );
                    }}
                  >
                    <option value="">Elige un insumo</option>
                    {supplies.map((supply) => (
                      <option key={supply.id} value={supply.id}>
                        {supply.name} ({supply.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    className={controlClassName}
                    aria-label={`Cantidad ${String(index + 1)}`}
                    type="number"
                    min={0}
                    step="any"
                    value={line.quantity}
                    onChange={(e) => {
                      setLines(
                        lines.map((l, i) => (i === index ? { ...l, quantity: e.target.value } : l)),
                      );
                    }}
                  />
                  <Button
                    variant="ghost"
                    iconOnly
                    aria-label={`Quitar insumo ${String(index + 1)}`}
                    onClick={() => {
                      setLines(lines.filter((_, i) => i !== index));
                    }}
                  >
                    <X size={18} aria-hidden="true" />
                  </Button>
                </div>
              ))}
              {save.error && (
                <p role="alert" className={styles.error}>
                  {save.error.message}
                </p>
              )}
              <div className={styles.formActions}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setLines([...lines, { supplyId: '', quantity: '1' }]);
                  }}
                >
                  <Plus size={18} aria-hidden="true" />
                  Agregar insumo
                </Button>
                <Button
                  variant="primary"
                  disabled={
                    save.isPending ||
                    lines.some((line) => line.supplyId === '' || Number(line.quantity) <= 0)
                  }
                  onClick={() => {
                    save.mutate({
                      productId,
                      input: {
                        lines: lines.map((line) => ({
                          supplyId: line.supplyId,
                          quantity: Number(line.quantity),
                        })),
                      },
                    });
                  }}
                >
                  Guardar receta
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
      {recipes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Todavía no hay recetas"
          description="Elige un producto arriba y agrega los insumos que usa."
        />
      ) : (
        <ul role="list" className={styles.rows}>
          {recipes.map((recipe) => (
            <Card as="li" key={recipe.productId} className={styles.recipeRow}>
              <strong>{recipe.productName}</strong>
              <ul role="list" className={styles.chips}>
                {recipe.lines.map((line) => (
                  <li key={line.supplyId} className={styles.chip}>
                    {String(line.quantity)} ×{' '}
                    {supplies.find((s) => s.id === line.supplyId)?.name ?? '—'}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
