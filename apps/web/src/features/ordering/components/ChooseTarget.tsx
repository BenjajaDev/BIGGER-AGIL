import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router';
import { Page } from '../../../components/layout/Page';
import { AsyncContent } from '../../../components/ui/AsyncContent';
import { ButtonLink } from '../../../components/ui/Button';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { TABLE_STATUS_PRESENTATION } from '../../tables/table-status';
import { useTableOverview } from '../../tables/useTableOverview';
import styles from './ChooseTarget.module.css';

/** First step of a new order: pick the table (or takeaway) right here, without a detour. */
export function ChooseTarget() {
  const tablesQuery = useTableOverview();

  return (
    <Page width="narrow">
      <PageHeader
        title="¿Para quién es el pedido?"
        documentTitle="Pedido · BIGGER"
        subtitle="Toca la mesa. Si ya tiene una cuenta abierta, el pedido se suma a ella."
      />

      <AsyncContent query={tablesQuery} loadingLabel="Cargando mesas…">
        {(tables) => (
          <ul role="list" className={styles.grid}>
            {tables.map((table) => {
              const presentation = TABLE_STATUS_PRESENTATION[table.status];
              return (
                <li key={table.id}>
                  <Link
                    to={`/pedido?mesa=${table.id}`}
                    className={styles.table}
                    data-status={table.status}
                    aria-label={`${table.label}, ${presentation.label}`}
                  >
                    <span className={styles.label}>{table.label}</span>
                    <StatusBadge
                      tone={presentation.tone}
                      icon={presentation.icon}
                      label={presentation.label}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </AsyncContent>

      <ButtonLink to="/pedido?canal=takeaway" variant="primary" size="lg" fullWidth>
        <ShoppingBag size={20} aria-hidden="true" />
        Pedido para llevar
      </ButtonLink>
    </Page>
  );
}
