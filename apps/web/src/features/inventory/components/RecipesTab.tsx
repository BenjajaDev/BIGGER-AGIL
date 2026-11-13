import type { Recipe, Supply } from '@bigger/shared';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
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
      <p className={styles.empty}>
        Define qué insumos usa una unidad de cada producto: al venderlo, el stock baja solo.
      </p>
      <Card>
        <div className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="receta-producto">Producto</label>
            <select
              id="receta-producto"
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
          </div>
          {productId !== '' && (
            <>
              {lines.map((line, index) => (
                <div key={`${line.supplyId}-${String(index)}`} className={styles.lineRow}>
                  <select
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
                    onClick={() => {
                      setLines(lines.filter((_, i) => i !== index));
                    }}
                  >
                    Quitar<span className="visually-hidden"> insumo {String(index + 1)}</span>
                  </Button>
                </div>
              ))}
              {save.error && (
                <p role="alert" className={styles.error}>
                  {save.error.message}
                </p>
              )}
              <div className={styles.actions}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setLines([...lines, { supplyId: '', quantity: '1' }]);
                  }}
                >
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
      {recipes.length > 0 && (
        <ul role="list" className={styles.list}>
          {recipes.map((recipe) => (
            <li key={recipe.productId} className={styles.listRow}>
              <strong>{recipe.productName}</strong>
              <span className={styles.rowMeta}>
                {recipe.lines
                  .map(
                    (line) =>
                      `${String(line.quantity)} × ${supplies.find((supply) => supply.id === line.supplyId)?.name ?? '—'}`,
                  )
                  .join(', ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
