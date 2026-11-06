import { Plus } from 'lucide-react';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { ButtonLink } from '../../components/ui/Button';
import { useNow } from '../../hooks/useNow';
import { usePrinterStatus } from '../printing/usePrinter';
import { useKitchenOrders } from '../kitchen/useKitchenOrders';
import { useTableOverview } from '../tables/useTableOverview';
import { AttentionList } from './components/AttentionList';
import { InProgressCard } from './components/InProgressCard';
import { KitchenLive } from './components/KitchenLive';
import { LastTicketCard } from './components/LastTicketCard';
import { TablesSection } from './components/TablesSection';
import styles from './SummaryPage.module.css';
import { attentionItems, kitchenLanes, openFigures } from './summary-model';

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export function SummaryPage() {
  const tablesQuery = useTableOverview();
  const kitchenQuery = useKitchenOrders();
  const printer = usePrinterStatus().data;
  const now = useNow(15_000);
  const tables = tablesQuery.data ?? [];
  const orders = kitchenQuery.data ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Resumen de hoy</h1>
          <p className={styles.date}>{dateFormatter.format(now)}</p>
        </div>
        <ButtonLink
          to="/pedido"
          viewTransition
          variant="primary"
          size="lg"
          className={styles.create}
        >
          <Plus size={20} aria-hidden="true" />
          Nuevo pedido
        </ButtonLink>
      </header>

      <div className={styles.grid}>
        <div className={styles.main}>
          <div className={styles.tables}>
            <AsyncContent query={tablesQuery} loadingLabel="Cargando mesas…">
              {(loaded) => <TablesSection tables={loaded} now={now} />}
            </AsyncContent>
          </div>
          <div className={styles.kitchen}>
            <AsyncContent query={kitchenQuery} loadingLabel="Cargando cocina…">
              {(loaded) => <KitchenLive lanes={kitchenLanes(loaded)} now={now} />}
            </AsyncContent>
          </div>
        </div>
        <div className={styles.side}>
          <div className={styles.attention}>
            <AttentionList items={attentionItems({ tables, orders, printer, now })} />
          </div>
          <div className={styles.progress}>
            <InProgressCard figures={openFigures(tables)} />
          </div>
          {printer?.enabled && (
            <div className={styles.printed}>
              <LastTicketCard />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
