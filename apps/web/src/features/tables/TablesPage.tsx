import { Plus } from 'lucide-react';
import { ButtonLink } from '../../components/ui/Button';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { Card } from '../../components/ui/Card';
import { useNow } from '../../hooks/useNow';
import { WhatsAppOrdersPanel } from '../orders/components/WhatsAppOrdersPanel';
import { TableMap } from './components/TableMap';
import { TableStatusLegend } from './components/TableStatusLegend';
import styles from './TablesPage.module.css';
import { useTableOverview } from './useTableOverview';

export function TablesPage() {
  const tablesQuery = useTableOverview();
  const now = useNow();

  return (
    <div className={styles.layout}>
      <section aria-labelledby="mesas-titulo">
        <div className={styles.header}>
          <h1 id="mesas-titulo" className={styles.title}>
            Mesas del salón
          </h1>
          <TableStatusLegend />
        </div>
        <AsyncContent query={tablesQuery} loadingLabel="Cargando mesas…">
          {(tables) => <TableMap tables={tables} now={now} />}
        </AsyncContent>
      </section>

      <Card as="aside" className={styles.aside} aria-label="Pedidos fuera de mesa">
        <ButtonLink to="/pedido?canal=takeaway" variant="primary" size="lg" fullWidth>
          <Plus size={20} aria-hidden="true" />
          Pedido para llevar
        </ButtonLink>
        <WhatsAppOrdersPanel now={now} />
      </Card>
    </div>
  );
}
