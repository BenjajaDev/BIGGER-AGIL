import { Plus } from 'lucide-react';
import { Page } from '../../components/layout/Page';
import { PageHeader } from '../../components/ui/PageHeader';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { ButtonLink } from '../../components/ui/Button';
import { useNow } from '../../hooks/useNow';
import { usePrinterStatus } from '../printing/usePrinter';
import { useKitchenOrders } from '../kitchen/useKitchenOrders';
import { useTableOverview } from '../tables/useTableOverview';
import { localToday } from '../../lib/dates';
import { AttentionList } from './components/AttentionList';
import { InProgressCard } from './components/InProgressCard';
import { KitchenLive } from './components/KitchenLive';
import { LastTicketCard } from './components/LastTicketCard';
import { TablesSection } from './components/TablesSection';
import { TodayFigures } from './components/TodayFigures';
import styles from './SummaryPage.module.css';
import { attentionItems, kitchenLanes, openFigures, supplyAttentionItems } from './summary-model';
import { alertedSupplies, useIsAdmin, useSupplyAlerts, useTodaySales } from './useAdminFigures';

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase('es-CL') + text.slice(1);

export function SummaryPage() {
  const tablesQuery = useTableOverview();
  const kitchenQuery = useKitchenOrders();
  const printer = usePrinterStatus().data;
  const now = useNow(15_000);
  const tables = tablesQuery.data ?? [];
  const orders = kitchenQuery.data ?? [];
  const isAdmin = useIsAdmin();
  const today = localToday(now);
  const sales = useTodaySales(isAdmin, today);
  const supplies = useSupplyAlerts(isAdmin);
  const bodegaItems = supplyAttentionItems(alertedSupplies(supplies.data ?? [], today));

  return (
    <Page>
      <PageHeader
        title="Resumen de hoy"
        documentTitle="Resumen · BIGGER"
        subtitle={capitalize(dateFormatter.format(now))}
        actions={
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
        }
      />

      {isAdmin && (
        <div className={styles.cash}>
          <TodayFigures sales={sales} />
        </div>
      )}

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
            <AttentionList
              items={[...attentionItems({ tables, orders, printer, now }), ...bodegaItems]}
            />
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
    </Page>
  );
}
