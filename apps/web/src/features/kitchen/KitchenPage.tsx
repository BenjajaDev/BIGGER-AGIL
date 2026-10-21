import { AsyncContent } from '../../components/ui/AsyncContent';
import { useNow } from '../../hooks/useNow';
import { KitchenBoard } from './components/KitchenBoard';
import styles from './KitchenPage.module.css';
import { groupByKitchenStatus, useKitchenOrders } from './useKitchenOrders';

export function KitchenPage() {
  const ordersQuery = useKitchenOrders();
  const now = useNow(15_000);

  return (
    <div className={styles.page}>
      <h1 className="visually-hidden">Vista de cocina</h1>
      <AsyncContent query={ordersQuery} loadingLabel="Cargando pedidos…" inverse>
        {(orders) => <KitchenBoard orders={groupByKitchenStatus(orders)} now={now} />}
      </AsyncContent>
    </div>
  );
}
