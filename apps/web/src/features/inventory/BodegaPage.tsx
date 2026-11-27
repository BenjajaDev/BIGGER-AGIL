import { supplyAlert } from '@bigger/shared';
import { PackagePlus, Plus } from 'lucide-react';
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
import { BodegaSheets, type SheetState } from './components/BodegaSheets';
import { InventoryTab } from './components/InventoryTab';
import { MovementToast } from './components/MovementToast';
import { PurchasesTab } from './components/PurchasesTab';
import { RecipesTab } from './components/RecipesTab';
import { SuppliersTab } from './components/SuppliersTab';
import type { SavedMovement } from './useMovementForm';
import { usePurchaseList, useRecipes, useSuppliers, useSupplies } from './useInventory';

type TabId = 'stock' | 'compras' | 'proveedores' | 'recetas';

const LIST_SKELETON = <Skeleton lines={4} height="4.5rem" />;

function BodegaContent() {
  const [tab, setTab] = useState<TabId>('stock');
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [saved, setSaved] = useState<SavedMovement | null>(null);
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const supplies = useSupplies();
  const suppliers = useSuppliers();
  const purchases = usePurchaseList();
  const recipes = useRecipes();

  const today = localToday();
  const needAttention = (supplies.data ?? []).filter(
    (supply) => supplyAlert(supply, today) !== 'ok',
  ).length;
  const items: readonly TabItem<TabId>[] = [
    {
      value: 'stock',
      label: 'Inventario',
      ...(needAttention ? { count: needAttention, countTone: 'warning' as const } : {}),
    },
    {
      value: 'compras',
      label: 'Por comprar',
      ...(purchases.data?.length ? { count: purchases.data.length } : {}),
    },
    { value: 'proveedores', label: 'Proveedores' },
    { value: 'recetas', label: 'Recetas' },
  ];

  const action =
    tab === 'stock' ? (
      <div className={styles.headerActions}>
        <Button
          variant="secondary"
          onClick={() => {
            setSheet({ type: 'supply', supplyId: null });
          }}
        >
          <Plus size={18} aria-hidden="true" />
          Nuevo insumo
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            setSheet({ type: 'arrival' });
          }}
        >
          <PackagePlus size={18} aria-hidden="true" />
          Registrar llegada
        </Button>
      </div>
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
      <PageHeader title="Bodega y compras" actions={action} />
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
            {(loaded) => (
              <InventoryTab
                supplies={loaded}
                onOpen={(supply) => {
                  setSheet({ type: 'ficha', supplyId: supply.id, initial: {} });
                }}
                onCreate={() => {
                  setSheet({ type: 'supply', supplyId: null });
                }}
              />
            )}
          </AsyncContent>
        )}
        {tab === 'compras' && (
          <AsyncContent
            query={purchases}
            loadingLabel="Armando la lista de compra…"
            skeleton={LIST_SKELETON}
          >
            {(groups) => (
              <PurchasesTab
                groups={groups}
                onArrive={(supplyId, quantity) => {
                  setSheet({ type: 'ficha', supplyId, initial: { kind: 'purchase', quantity } });
                }}
              />
            )}
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
      <BodegaSheets
        sheet={sheet}
        supplies={supplies.data ?? []}
        suppliers={suppliers.data ?? []}
        onChange={setSheet}
        onSaved={setSaved}
      />
      {saved && (
        <MovementToast
          key={`${saved.supply.id}-${String(saved.previousStock)}-${String(saved.quantity)}`}
          saved={saved}
          onDone={() => {
            setSaved(null);
          }}
        />
      )}
    </Page>
  );
}

export function BodegaPage() {
  const session = useAdminSession();
  return (
    <AsyncContent query={session} loadingLabel="Verificando acceso…">
      {(current) =>
        current.authenticated ? (
          <BodegaContent />
        ) : (
          <PinLoginForm
            title="Bodega y compras"
            description="Ingresa el PIN de encargado para ver el inventario y las compras."
          />
        )
      }
    </AsyncContent>
  );
}
