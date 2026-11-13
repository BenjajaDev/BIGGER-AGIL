import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router';
import { AsyncContent } from '../../../components/ui/AsyncContent';
import { ButtonLink } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { TABLE_STATUS_PRESENTATION } from '../../tables/table-status';
import { useTableOverview } from '../../tables/useTableOverview';
import styles from './ChooseTarget.module.css';

/** First step of a new order: pick the table (or takeaway) right here, without a detour. */
export function ChooseTarget() {
  const tablesQuery = useTableOverview();

  return (
    <section className={styles.panel} aria-labelledby="destino-titulo">
      <header className={styles.header}>
        <h1 id="destino-titulo" className={styles.title}>
          ¿Para quién es el pedido?
        </h1>
        <p className={styles.description}>
          Toca la mesa. Si ya tiene una cuenta abierta, el pedido se suma a ella.
        </p>
      </header>

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
    </section>
  );
}
