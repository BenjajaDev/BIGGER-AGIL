import type { MenuProduct, Product } from '@bigger/shared';
import { CircleHelp, LayoutGrid, Search } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { controlClassName } from '../../components/form/control';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useCreateOrder } from '../orders/useOrders';
import { useTableOverview } from '../tables/useTableOverview';
import { CategoryFilter } from './components/CategoryFilter';
import { ComandaPanel } from './components/ComandaPanel';
import { OptionsModal } from './components/OptionsModal';
import { ProductGrid } from './components/ProductGrid';
import { draftToCreateOrder, type OrderTarget } from './draft-to-order';
import { EMPTY_CONFIG } from './order-draft';
import styles from './OrderTakingPage.module.css';
import { needsModal } from './product-options';
import { searchProducts } from './search-products';
import { useCategories, useProducts } from './useCatalog';
import { useOrderDraft } from './useOrderDraft';

type Target =
  | { kind: 'table'; label: string; tableId: string; hasOpenCheck: boolean }
  | { kind: 'takeaway' }
  | { kind: 'none' };

function useOrderTarget(): Target | null {
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('mesa');
  const tablesQuery = useTableOverview();

  if (searchParams.get('canal') === 'takeaway') return { kind: 'takeaway' };
  if (!tableId) return { kind: 'none' };
  if (tablesQuery.isPending) return null;

  const table = tablesQuery.data?.find((candidate) => candidate.id === tableId);
  return table
    ? { kind: 'table', label: table.label, tableId: table.id, hasOpenCheck: table.checkId !== null }
    : { kind: 'none' };
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
  const createOrder = useCreateOrder();
  const searchId = useId();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalProduct, setModalProduct] = useState<MenuProduct | null>(null);

  const activeCategoryId = selectedCategoryId ?? categoriesQuery.data?.[0]?.id ?? null;
  const visibleProducts = useMemo(() => {
    const products = productsQuery.data ?? [];
    if (search.trim()) return searchProducts(products, search);
    return products.filter((product) => product.categoryId === activeCategoryId);
  }, [productsQuery.data, activeCategoryId, search]);

  if (target === null) return null;
  if (target.kind === 'none') return <ChooseTarget />;

  const targetLabel = target.kind === 'table' ? target.label : 'Para llevar';
  const targetSubtitle =
    target.kind === 'table' && target.hasOpenCheck
      ? 'Se suma a la cuenta abierta de la mesa'
      : 'Detalle del pedido';

  const handleSubmit = () => {
    const orderTarget: OrderTarget =
      target.kind === 'table'
        ? { channel: 'dine-in', tableId: target.tableId }
        : { channel: 'takeaway', tableId: null };
    const input = draftToCreateOrder(
      { customerName: draft.customerName, lines: draft.lines },
      orderTarget,
    );
    createOrder.mutate(input, {
      onSuccess: () => {
        draft.clear();
      },
    });
  };

  const handleAdd = (product: Product) => {
    const full = productsQuery.data?.find((candidate) => candidate.id === product.id);
    if (full && needsModal(full)) {
      setModalProduct(full);
      return;
    }
    draft.addLine(product, EMPTY_CONFIG);
  };

  return (
    <div className={styles.layout}>
      <section className={styles.catalog} aria-labelledby="pedido-titulo">
        <h1 id="pedido-titulo" className={styles.title}>
          {targetLabel} · Agregar productos
        </h1>
        <div className={styles.search}>
          <label htmlFor={searchId} className="visually-hidden">
            Buscar producto
          </label>
          <Search className={styles.searchIcon} size={20} aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            className={controlClassName}
            value={search}
            placeholder="Buscar producto…"
            onChange={(event) => {
              setSearch(event.target.value);
            }}
          />
        </div>
        {!search.trim() && (
          <AsyncContent query={categoriesQuery} loadingLabel="Cargando categorías…">
            {(categories) => (
              <CategoryFilter
                categories={categories}
                selectedId={activeCategoryId}
                onSelect={setSelectedCategoryId}
              />
            )}
          </AsyncContent>
        )}
        <AsyncContent query={productsQuery} loadingLabel="Cargando productos…">
          {() =>
            visibleProducts.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Sin resultados"
                description="Prueba con otro nombre o cambia de categoría."
              />
            ) : (
              <ProductGrid products={visibleProducts} onAdd={handleAdd} />
            )
          }
        </AsyncContent>
      </section>

      <ComandaPanel
        heading={targetLabel}
        subtitle={targetSubtitle}
        customerName={draft.customerName}
        requireName={target.kind === 'takeaway'}
        lines={draft.lines}
        totalClp={draft.totalClp}
        onSetCustomerName={draft.setCustomerName}
        onIncrement={draft.increment}
        onDecrement={draft.decrement}
        onSetNote={draft.setNote}
        onSubmit={handleSubmit}
        isSubmitting={createOrder.isPending}
        error={
          createOrder.isError
            ? 'No se pudo enviar la comanda. Revisa la conexión e inténtalo de nuevo.'
            : undefined
        }
      />

      <OptionsModal
        product={modalProduct}
        onClose={() => {
          setModalProduct(null);
        }}
        onConfirm={(config) => {
          if (modalProduct) draft.addLine(modalProduct, config);
          setModalProduct(null);
        }}
      />
    </div>
  );
}
