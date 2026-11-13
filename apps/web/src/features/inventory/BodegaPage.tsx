import { useState } from 'react';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { Chip } from '../../components/ui/Chip';
import { PinLoginForm } from '../catalog-admin/components/PinLoginForm';
import { useAdminSession } from '../catalog-admin/useCatalogAdmin';
import styles from '../reports/ReportsPage.module.css';
import { InventoryTab } from './components/InventoryTab';
import { PurchasesTab } from './components/PurchasesTab';
import { RecipesTab } from './components/RecipesTab';
import { SuppliersTab } from './components/SuppliersTab';
import { usePurchaseList, useRecipes, useSuppliers, useSupplies } from './useInventory';

const TABS = [
  { id: 'stock', label: 'Inventario' },
  { id: 'compras', label: 'Lista de compra' },
  { id: 'proveedores', label: 'Proveedores' },
  { id: 'recetas', label: 'Recetas' },
] as const;
type TabId = (typeof TABS)[number]['id'];

function BodegaContent() {
  const [tab, setTab] = useState<TabId>('stock');
  const supplies = useSupplies();
  const suppliers = useSuppliers();
  const purchases = usePurchaseList();
  const recipes = useRecipes();
  return (
    <section className={styles.page} aria-labelledby="bodega-titulo">
      <h1 id="bodega-titulo" className={styles.title}>
        Bodega y compras
      </h1>
      <div role="group" aria-label="Secciones de bodega" className={styles.chips}>
        {TABS.map((option) => (
          <Chip
            key={option.id}
            pressed={tab === option.id}
            onClick={() => {
              setTab(option.id);
            }}
          >
            {option.label}
          </Chip>
        ))}
      </div>
      {tab === 'stock' && (
        <AsyncContent query={supplies} loadingLabel="Cargando el inventario…">
          {(loadedSupplies) => (
            <AsyncContent query={suppliers} loadingLabel="Cargando proveedores…">
              {(loadedSuppliers) => (
                <InventoryTab supplies={loadedSupplies} suppliers={loadedSuppliers} />
              )}
            </AsyncContent>
          )}
        </AsyncContent>
      )}
      {tab === 'compras' && (
        <AsyncContent query={purchases} loadingLabel="Armando la lista de compra…">
          {(groups) => <PurchasesTab groups={groups} />}
        </AsyncContent>
      )}
      {tab === 'proveedores' && (
        <AsyncContent query={suppliers} loadingLabel="Cargando proveedores…">
          {(loaded) => <SuppliersTab suppliers={loaded} />}
        </AsyncContent>
      )}
      {tab === 'recetas' && (
        <AsyncContent query={supplies} loadingLabel="Cargando insumos…">
          {(loadedSupplies) => (
            <AsyncContent query={recipes} loadingLabel="Cargando recetas…">
              {(loadedRecipes) => <RecipesTab supplies={loadedSupplies} recipes={loadedRecipes} />}
            </AsyncContent>
          )}
        </AsyncContent>
      )}
    </section>
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
