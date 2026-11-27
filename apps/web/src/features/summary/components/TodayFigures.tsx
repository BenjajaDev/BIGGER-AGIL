import type { SalesReport, SalesTotals } from '@bigger/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { Receipt, ShoppingBag, Wallet } from 'lucide-react';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { Skeleton } from '../../../components/ui/Skeleton';
import { StatCard } from '../../../components/ui/StatCard';
import { Link } from 'react-router';
import { formatClp, pluralize } from '../../../lib/format';
import styles from './TodayFigures.module.css';

function Cards({ totals, previous }: { totals: SalesTotals; previous: SalesTotals }) {
  const yesterday = {
    sales: `Ayer: ${formatClp(previous.salesClp)}`,
    orders: `Ayer: ${pluralize(previous.orders, 'pedido', 'pedidos')}`,
    ticket: `Ayer: ${formatClp(previous.averageTicketClp)}`,
  };
  return (
    <>
      <div className={styles.grid}>
        <StatCard
          label="Ventas"
          value={formatClp(totals.salesClp)}
          icon={Wallet}
          hint={yesterday.sales}
          to="/reportes"
        />
        <StatCard
          label="Pedidos"
          value={String(totals.orders)}
          icon={ShoppingBag}
          hint={yesterday.orders}
          to="/reportes"
        />
        <StatCard
          label="Ticket promedio"
          value={formatClp(totals.averageTicketClp)}
          icon={Receipt}
          hint={yesterday.ticket}
          to="/reportes"
        />
      </div>
      <Link to="/reportes" className={styles.compact}>
        <span className={styles.figure}>
          <span className={styles.figureLabel}>Ventas</span>
          <span className={styles.figureValue}>{formatClp(totals.salesClp)}</span>
        </span>
        <span className={styles.figure}>
          <span className={styles.figureLabel}>Pedidos</span>
          <span className={styles.figureValue}>{totals.orders}</span>
        </span>
        <span className={styles.figure}>
          <span className={styles.figureLabel}>Ticket prom.</span>
          <span className={styles.figureValue}>{formatClp(totals.averageTicketClp)}</span>
        </span>
      </Link>
    </>
  );
}

/** «Hoy en caja»: only rendered while the manager's session is active. */
export function TodayFigures({ sales }: { sales: UseQueryResult<SalesReport> }) {
  if (sales.isError) return null;

  return (
    <section aria-labelledby="hoy-en-caja" className={styles.section}>
      <SectionHeader title="Hoy en caja" id="hoy-en-caja" />
      {sales.data ? (
        <Cards totals={sales.data.totals} previous={sales.data.previous} />
      ) : (
        <div role="status">
          <span className="visually-hidden">Cargando ventas de hoy…</span>
          <div className={styles.grid}>
            <Skeleton height="6.5rem" />
            <Skeleton height="6.5rem" />
            <Skeleton height="6.5rem" />
          </div>
        </div>
      )}
    </section>
  );
}
