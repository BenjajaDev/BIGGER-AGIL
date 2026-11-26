import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Page } from '../../components/layout/Page';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { Tabs, tabPanelProps, type TabItem } from '../../components/ui/Tabs';
import { localToday } from '../../lib/dates';
import { PinLoginForm } from '../catalog-admin/components/PinLoginForm';
import { useAdminSession } from '../catalog-admin/useCatalogAdmin';
import styles from './BodegaPage.module.css';
import { InventoryTab } from './components/InventoryTab';
import { PurchasesTab } from './components/PurchasesTab';
import { RecipesTab } from './components/RecipesTab';
import { SuppliersTab } from './components/SuppliersTab';
import { countByAlert } from './supply-text';
import { usePurchaseList, useRecipes, useSuppliers, useSupplies } from './useInventory';

type TabId = 'stock' | 'compras' | 'proveedores' | 'recetas';

const LIST_SKELETON = <Skeleton lines={4} height="4.5rem" />;

function BodegaContent() {
  const [tab, setTab] = useState<TabId>('stock');
  const [creatingSupply, setCreatingSupply] = useState(false);
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const supplies = useSupplies();
  const suppliers = useSuppliers();
  const purchases = usePurchaseList();
  const recipes = useRecipes();

  const counts = supplies.data ? countByAlert(supplies.data, localToday()) : null;
  const needAttention = counts ? (supplies.data?.length ?? 0) - counts.ok : undefined;
  const items: readonly TabItem<TabId>[] = [
    {
      value: 'stock',
      label: 'Inventario',
      ...(needAttention ? { count: needAttention, countTone: 'warning' as const } : {}),
    },
    {
      value: 'compras',
      label: 'Lista de compra',
      ...(purchases.data?.length ? { count: purchases.data.length } : {}),
    },
    { value: 'proveedores', label: 'Proveedores' },
    { value: 'recetas', label: 'Recetas' },
  ];

  const action =
    tab === 'stock' ? (
      <Button
        variant="primary"
        onClick={() => {
          setCreatingSupply(true);
        }}
      >
        <Plus size={18} aria-hidden="true" />
        Nuevo insumo
      </Button>
    ) : tab === 'proveedores' ? (
      <Button
        variant="primary"
        onClick={() => {
          setCreatingSupplier(true);
        }}
      >
        <Plus size={18} aria-hidden="true" />
        Nuevo proveedor
      </Button>
    ) : undefined;

  return (
    <Page>
      <PageHeader
        title="Bodega y compras"
        subtitle="Stock de insumos, pedidos a proveedores y recetas."
        actions={action}
      />
      <Tabs
        label="Secciones de bodega"
        idBase="bodega"
        items={items}
        value={tab}
        onChange={setTab}
      />
      <div {...tabPanelProps('bodega', tab)} className={styles.panel}>
        {tab === 'stock' && (
          <AsyncContent
            query={supplies}
            loadingLabel="Cargando el inventario…"
            skeleton={LIST_SKELETON}
          >
            {(loadedSupplies) => (
              <AsyncContent
                query={suppliers}
                loadingLabel="Cargando proveedores…"
                skeleton={LIST_SKELETON}
              >
                {(loadedSuppliers) => (
                  <InventoryTab
                    supplies={loadedSupplies}
                    suppliers={loadedSuppliers}
                    creating={creatingSupply}
                    onCreate={() => {
                      setCreatingSupply(true);
                    }}
                    onCloseCreate={() => {
                      setCreatingSupply(false);
                    }}
                  />
                )}
              </AsyncContent>
            )}
          </AsyncContent>
        )}
        {tab === 'compras' && (
          <AsyncContent
            query={purchases}
            loadingLabel="Armando la lista de compra…"
            skeleton={LIST_SKELETON}
          >
            {(groups) => <PurchasesTab groups={groups} />}
          </AsyncContent>
        )}
        {tab === 'proveedores' && (
          <AsyncContent
            query={suppliers}
            loadingLabel="Cargando proveedores…"
            skeleton={LIST_SKELETON}
          >
            {(loaded) => (
              <SuppliersTab
                suppliers={loaded}
                creating={creatingSupplier}
                onCreate={() => {
                  setCreatingSupplier(true);
                }}
                onCloseCreate={() => {
                  setCreatingSupplier(false);
                }}
              />
            )}
          </AsyncContent>
        )}
        {tab === 'recetas' && (
          <AsyncContent query={supplies} loadingLabel="Cargando insumos…" skeleton={LIST_SKELETON}>
            {(loadedSupplies) => (
              <AsyncContent
                query={recipes}
                loadingLabel="Cargando recetas…"
                skeleton={LIST_SKELETON}
              >
                {(loadedRecipes) => (
                  <RecipesTab supplies={loadedSupplies} recipes={loadedRecipes} />
                )}
              </AsyncContent>
            )}
          </AsyncContent>
        )}
      </div>
    </Page>
  );
}

export function BodegaPage() {
  const session = useAdminSession();
  return (
    <AsyncContent query={session} loadingLabel="Verificando acceso…">
      {(current) => (current.authenticated ? <BodegaContent /> : <PinLoginForm />)}
    </AsyncContent>
  );
}
