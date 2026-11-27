import type { ReportRange } from '@bigger/shared';
import { Coins, HandCoins, Receipt, ShoppingBag } from 'lucide-react';
import { AsyncContent } from '../../../components/ui/AsyncContent';
import { Card } from '../../../components/ui/Card';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { Skeleton } from '../../../components/ui/Skeleton';
import { StatCard } from '../../../components/ui/StatCard';
import { formatClp } from '../../../lib/format';
import styles from '../ReportsPage.module.css';
import { trendFor } from '../report-format';

/** Today is still in progress: comparing it with a full day is misleading, so show yesterday. */
function compare(inProgress: boolean, current: number, previous: number, hint: string) {
  return inProgress
    ? { hint: `Ayer: ${hint}` }
    : { trend: trendFor(current, previous), hint: `Antes: ${hint}` };
}
import { useSalesReport } from '../useReports';
import { DailyChart, MethodTable, RankedBars } from './SalesCharts';

function SalesSkeleton() {
  return (
    <div className={styles.stack}>
      <div className={styles.kpis}>
        {[0, 1, 2, 3].map((key) => (
          <Card key={key}>
            <Skeleton lines={3} height="1.25rem" />
          </Card>
        ))}
      </div>
      <Card>
        <Skeleton height="12rem" />
      </Card>
    </div>
  );
}

export function SalesView({ range, inProgress }: { range: ReportRange; inProgress: boolean }) {
  const query = useSalesReport(range);
  return (
    <AsyncContent query={query} loadingLabel="Calculando ventas…" skeleton={<SalesSkeleton />}>
      {(report) => (
        <div className={styles.stack}>
          <div className={styles.kpis}>
            <StatCard
              label="Ventas"
              icon={Coins}
              value={formatClp(report.totals.salesClp)}
              {...compare(
                inProgress,
                report.totals.salesClp,
                report.previous.salesClp,
                formatClp(report.previous.salesClp),
              )}
            />
            <StatCard
              label="Pedidos"
              icon={ShoppingBag}
              value={String(report.totals.orders)}
              {...compare(
                inProgress,
                report.totals.orders,
                report.previous.orders,
                `${String(report.previous.orders)} pedidos`,
              )}
            />
            <StatCard
              label="Ticket promedio"
              icon={Receipt}
              value={formatClp(report.totals.averageTicketClp)}
              {...compare(
                inProgress,
                report.totals.averageTicketClp,
                report.previous.averageTicketClp,
                formatClp(report.previous.averageTicketClp),
              )}
            />
            <StatCard
              label="Propinas"
              icon={HandCoins}
              value={formatClp(report.totals.tipsClp)}
              {...compare(
                inProgress,
                report.totals.tipsClp,
                report.previous.tipsClp,
                formatClp(report.previous.tipsClp),
              )}
            />
          </div>
          <Card as="section" aria-labelledby="dia-titulo" className={styles.section}>
            <SectionHeader id="dia-titulo" title="Ventas por día" />
            <DailyChart days={report.byDay} />
          </Card>
          <div className={styles.two}>
            <Card as="section" aria-labelledby="top-titulo" className={styles.section}>
              <SectionHeader id="top-titulo" title="Lo más vendido" />
              {report.topProducts.length === 0 ? (
                <p className={styles.empty}>Todavía no hay ventas en este período.</p>
              ) : (
                <RankedBars rows={report.topProducts} unit="un." />
              )}
            </Card>
            <Card as="section" aria-labelledby="lento-titulo" className={styles.section}>
              <SectionHeader
                id="lento-titulo"
                title="Poca salida"
                description="Candidatos para comprar menos y evitar mermas."
              />
              <RankedBars rows={report.slowProducts} unit="un." />
            </Card>
          </div>
          <Card as="section" aria-labelledby="medio-titulo" className={styles.section}>
            <SectionHeader id="medio-titulo" title="Medios de pago" />
            <MethodTable rows={report.byMethod} />
          </Card>
        </div>
      )}
    </AsyncContent>
  );
}
