import { CircleHelp, LayoutGrid } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTableOverview } from '../tables/useTableOverview';
import { CategoryFilter } from './components/CategoryFilter';
import { ComandaPanel } from './components/ComandaPanel';
import { ProductGrid } from './components/ProductGrid';
import styles from './OrderTakingPage.module.css';
import { useCategories, useProducts } from './useCatalog';
import { useOrderDraft } from './useOrderDraft';

type OrderTarget = { kind: 'table'; label: string } | { kind: 'takeaway' } | { kind: 'none' };

function useOrderTarget(): OrderTarget | null {
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('mesa');
  const tablesQuery = useTableOverview();

  if (searchParams.get('canal') === 'takeaway') return { kind: 'takeaway' };
  if (!tableId) return { kind: 'none' };
  if (tablesQuery.isPending) return null;

  const table = tablesQuery.data?.find((candidate) => candidate.id === tableId);
  return table ? { kind: 'table', label: table.label } : { kind: 'none' };
}

function ChooseTarget() {
  return (
    <div className={styles.centered}>
      <EmptyState
        icon={CircleHelp}
        title="¿Para quién es el pedido?"
        description="Elige una mesa en el mapa o inicia un pedido para llevar desde Mesas."
        action={
          <ButtonLink to="/mesas" variant="secondary">
            <LayoutGrid size={18} aria-hidden="true" />
            Ir a Mesas
          </ButtonLink>
        }
      />
    </div>
  );
}

export function OrderTakingPage() {
  const target = useOrderTarget();
  const categoriesQuery = useCategories();
  const productsQuery = useProducts();
  const draft = useOrderDraft();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const activeCategoryId = selectedCategoryId ?? categoriesQuery.data?.[0]?.id ?? null;
  const visibleProducts = useMemo(
    () => productsQuery.data?.filter((product) => product.categoryId === activeCategoryId) ?? [],
    [productsQuery.data, activeCategoryId],
  );

  if (target === null) return null;
  if (target.kind === 'none') return <ChooseTarget />;

  const targetLabel = target.kind === 'table' ? target.label : 'Para llevar';

  return (
    <div className={styles.layout}>
      <section className={styles.catalog} aria-labelledby="pedido-titulo">
        <h1 id="pedido-titulo" className={styles.title}>
          {targetLabel} · Agregar productos
        </h1>
        <AsyncContent query={categoriesQuery} loadingLabel="Cargando categorías…">
          {(categories) => (
            <CategoryFilter
              categories={categories}
              selectedId={activeCategoryId}
              onSelect={setSelectedCategoryId}
            />
          )}
        </AsyncContent>
        <AsyncContent query={productsQuery} loadingLabel="Cargando productos…">
          {() => <ProductGrid products={visibleProducts} onAdd={draft.add} />}
        </AsyncContent>
      </section>

      <ComandaPanel
        title={`Comanda · ${targetLabel}`}
        lines={draft.lines}
        totalClp={draft.totalClp}
        onIncrement={draft.increment}
        onDecrement={draft.decrement}
        onToggleNote={draft.toggleNote}
      />
    </div>
  );
}
