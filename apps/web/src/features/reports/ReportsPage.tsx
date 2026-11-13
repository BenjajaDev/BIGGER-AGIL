import type { ReportKind, ReportRange } from '@bigger/shared';
import { Coins, Download, HandCoins, type LucideIcon, Receipt, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { localToday } from '../../lib/dates';
import { formatClp } from '../../lib/format';
import { PinLoginForm } from '../catalog-admin/components/PinLoginForm';
import { useAdminSession } from '../catalog-admin/useCatalogAdmin';
import { reportsService } from '../../services/reports.service';
import { CashCloseCard } from './components/CashCloseCard';
import { DailyChart, MethodTable, RankedBars } from './components/SalesCharts';
import styles from './ReportsPage.module.css';
import {
  deltaPercent,
  formatDelta,
  PERIOD_LABELS,
  PERIOD_PRESETS,
  presetRange,
  type PeriodPreset,
} from './report-format';
import { useCashClose, useSalesReport } from './useReports';

const EXPORTS: readonly { kind: ReportKind; label: string }[] = [
  { kind: 'daily', label: 'Ventas por día' },
  { kind: 'products', label: 'Productos' },
  { kind: 'payments', label: 'Medios de pago' },
];

interface KpiProps {
  label: string;
  value: string;
  icon: LucideIcon;
  current: number;
  previous: number;
}

function Kpi({ label, value, icon: Icon, current, previous }: KpiProps) {
  const change = deltaPercent(current, previous);
  const trend = change === null || change === 0 ? 'flat' : change > 0 ? 'up' : 'down';
  return (
    <Card className={styles.kpi}>
      <p className={styles.kpiLabel}>
        <span className={styles.kpiIcon}>
          <Icon size={18} aria-hidden="true" />
        </span>
        {label}
      </p>
      <p className={styles.kpiValue}>{value}</p>
      <p className={styles.kpiDelta} data-trend={trend}>
        {formatDelta(change)}
      </p>
    </Card>
  );
}

function SalesView({ range }: { range: ReportRange }) {
  const query = useSalesReport(range);
  return (
    <AsyncContent query={query} loadingLabel="Calculando ventas…">
      {(report) => (
        <>
          <div className={styles.kpis}>
            <Kpi
              label="Ventas"
              icon={Coins}
              value={formatClp(report.totals.salesClp)}
              current={report.totals.salesClp}
              previous={report.previous.salesClp}
            />
            <Kpi
              label="Pedidos"
              icon={ShoppingBag}
              value={String(report.totals.orders)}
              current={report.totals.orders}
              previous={report.previous.orders}
            />
            <Kpi
              label="Ticket promedio"
              icon={Receipt}
              value={formatClp(report.totals.averageTicketClp)}
              current={report.totals.averageTicketClp}
              previous={report.previous.averageTicketClp}
            />
            <Kpi
              label="Propinas"
              icon={HandCoins}
              value={formatClp(report.totals.tipsClp)}
              current={report.totals.tipsClp}
              previous={report.previous.tipsClp}
            />
          </div>
          <Card as="section" aria-labelledby="dia-titulo" className={styles.section}>
            <h2 id="dia-titulo" className={styles.h2}>
              Ventas por día
            </h2>
            <DailyChart days={report.byDay} />
          </Card>
          <div className={styles.two}>
            <Card as="section" aria-labelledby="top-titulo" className={styles.section}>
              <h2 id="top-titulo" className={styles.h2}>
                Lo más vendido
              </h2>
              {report.topProducts.length === 0 ? (
                <p className={styles.empty}>Todavía no hay ventas en este período.</p>
              ) : (
                <RankedBars rows={report.topProducts} unit="un." />
              )}
            </Card>
            <Card as="section" aria-labelledby="lento-titulo" className={styles.section}>
              <h2 id="lento-titulo" className={styles.h2}>
                Poca salida
              </h2>
              <p className={styles.empty}>Candidatos para comprar menos y evitar mermas.</p>
              <RankedBars rows={report.slowProducts} unit="un." />
            </Card>
          </div>
          <Card as="section" aria-labelledby="medio-titulo" className={styles.section}>
            <h2 id="medio-titulo" className={styles.h2}>
              Medios de pago
            </h2>
            <MethodTable rows={report.byMethod} />
          </Card>
        </>
      )}
    </AsyncContent>
  );
}

function CashView({ date }: { date: string }) {
  const query = useCashClose(date);
  return (
    <AsyncContent query={query} loadingLabel="Cargando la caja…">
      {(summary) => <CashCloseCard summary={summary} />}
    </AsyncContent>
  );
}

function ReportsContent() {
  const today = localToday();
  const [preset, setPreset] = useState<PeriodPreset>('week');
  const [custom, setCustom] = useState<ReportRange>({ from: today, to: today });
  const range = preset === 'custom' ? custom : presetRange(preset, today);
  const validCustom = custom.from <= custom.to;

  return (
    <section className={styles.page} aria-labelledby="reportes-titulo">
      <h1 id="reportes-titulo" className={styles.title}>
        Reportes y caja
      </h1>
      <div role="group" aria-label="Período" className={styles.chips}>
        {PERIOD_PRESETS.map((option) => (
          <Chip
            key={option}
            pressed={preset === option}
            onClick={() => {
              setPreset(option);
            }}
          >
            {PERIOD_LABELS[option]}
          </Chip>
        ))}
      </div>
      {preset === 'custom' && (
        <div className={styles.dates}>
          <label>
            Desde
            <input
              type="date"
              value={custom.from}
              max={today}
              onChange={(event) => {
                setCustom({ ...custom, from: event.target.value });
              }}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={custom.to}
              max={today}
              onChange={(event) => {
                setCustom({ ...custom, to: event.target.value });
              }}
            />
          </label>
        </div>
      )}
      {validCustom ? (
        <>
          <SalesView range={range} />
          <div className={styles.exports}>
            {EXPORTS.map(({ kind, label }) => (
              <ButtonLink
                key={kind}
                to={reportsService.csvUrl(range, kind)}
                reloadDocument
                download
                variant="secondary"
              >
                <Download size={18} aria-hidden="true" />
                CSV · {label}
              </ButtonLink>
            ))}
          </div>
        </>
      ) : (
        <p role="alert">La fecha final no puede ser anterior a la inicial.</p>
      )}
      <CashView date={today} />
    </section>
  );
}

export function ReportsPage() {
  const session = useAdminSession();
  return (
    <AsyncContent query={session} loadingLabel="Verificando acceso…">
      {(current) => (current.authenticated ? <ReportsContent /> : <PinLoginForm />)}
    </AsyncContent>
  );
}
