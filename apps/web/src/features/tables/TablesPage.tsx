import { Plus } from 'lucide-react';
import { Page } from '../../components/layout/Page';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useNow } from '../../hooks/useNow';
import { TakeawayOrdersPanel } from '../orders/components/TakeawayOrdersPanel';
import { TableMap } from './components/TableMap';
import { TableStatusLegend } from './components/TableStatusLegend';
import styles from './TablesPage.module.css';
import { useTableOverview } from './useTableOverview';

export function TablesPage() {
  const tablesQuery = useTableOverview();
  const now = useNow();

  return (
    <Page>
      <PageHeader
        title="Mesas del salón"
        documentTitle="Mesas · BIGGER"
        titleId="mesas-titulo"
        subtitle={<TableStatusLegend />}
      />
      <div className={styles.layout}>
        <section aria-labelledby="mesas-titulo" className={styles.map}>
          <AsyncContent
            query={tablesQuery}
            loadingLabel="Cargando mesas…"
            skeleton={<Skeleton lines={3} height="7.5rem" />}
          >
            {(tables) => <TableMap tables={tables} now={now} />}
          </AsyncContent>
        </section>

        <Card as="aside" className={styles.aside} aria-label="Pedidos fuera de mesa">
          <ButtonLink to="/pedido?canal=takeaway" variant="primary" size="lg" fullWidth>
            <Plus size={20} aria-hidden="true" />
            Pedido para llevar
          </ButtonLink>
          <TakeawayOrdersPanel now={now} />
        </Card>
      </div>
    </Page>
  );
}
