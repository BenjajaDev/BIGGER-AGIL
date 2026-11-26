import type { ReportKind, ReportRange } from '@bigger/shared';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { Field } from '../../components/form/Field';
import { controlClassName } from '../../components/form/control';
import { Page } from '../../components/layout/Page';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { Tabs, tabPanelProps } from '../../components/ui/Tabs';
import { localToday } from '../../lib/dates';
import { reportsService } from '../../services/reports.service';
import { PinLoginForm } from '../catalog-admin/components/PinLoginForm';
import { useAdminSession } from '../catalog-admin/useCatalogAdmin';
import { CashCloseCard } from './components/CashCloseCard';
import { SalesView } from './components/SalesView';
import styles from './ReportsPage.module.css';
import {
  describeRange,
  PERIOD_LABELS,
  PERIOD_PRESETS,
  presetRange,
  type PeriodPreset,
} from './report-format';
import { useCashClose } from './useReports';

const EXPORTS: readonly { kind: ReportKind; label: string }[] = [
  { kind: 'daily', label: 'Ventas por día' },
  { kind: 'products', label: 'Productos' },
  { kind: 'payments', label: 'Medios de pago' },
];

const PERIOD_TABS = PERIOD_PRESETS.map((value) => ({ value, label: PERIOD_LABELS[value] }));

function CashView({ date }: { date: string }) {
  const query = useCashClose(date);
  return (
    <AsyncContent
      query={query}
      loadingLabel="Cargando la caja…"
      skeleton={<Skeleton lines={4} height="1.5rem" />}
    >
      {(summary) => <CashCloseCard summary={summary} />}
    </AsyncContent>
  );
}

function ExportSection({ range }: { range: ReportRange }) {
  return (
    <Card as="section" aria-labelledby="descargar-titulo" className={styles.section}>
      <SectionHeader
        id="descargar-titulo"
        title="Descargar datos"
        description="Archivos CSV para abrir en Excel o Google Sheets"
      />
      <div role="group" aria-label="Descargar en CSV" className={styles.exports}>
        {EXPORTS.map(({ kind, label }) => (
          <ButtonLink
            key={kind}
            to={reportsService.csvUrl(range, kind)}
            reloadDocument
            download
            variant="secondary"
          >
            <Download size={18} aria-hidden="true" />
            {label}
            <span className="visually-hidden"> (CSV)</span>
          </ButtonLink>
        ))}
      </div>
    </Card>
  );
}

function ReportsContent() {
  const today = localToday();
  const [preset, setPreset] = useState<PeriodPreset>('week');
  const [custom, setCustom] = useState<ReportRange>({ from: today, to: today });
  const range = preset === 'custom' ? custom : presetRange(preset, today);
  const validCustom = custom.from <= custom.to;
  const valid = preset !== 'custom' || validCustom;

  return (
    <Page>
      <PageHeader
        title="Reportes y caja"
        subtitle={valid ? describeRange(range) : 'Elige un período válido'}
      />
      <Tabs
        label="Período"
        idBase="reportes"
        items={PERIOD_TABS}
        value={preset}
        onChange={setPreset}
      />
      <div {...tabPanelProps('reportes', preset)} className={styles.panel}>
        {preset === 'custom' && (
          <div className={styles.dates}>
            <Field label="Desde">
              {(control) => (
                <input
                  {...control}
                  type="date"
                  className={controlClassName}
                  value={custom.from}
                  max={today}
                  onChange={(event) => {
                    setCustom({ ...custom, from: event.target.value });
                  }}
                />
              )}
            </Field>
            <Field
              label="Hasta"
              error={validCustom ? undefined : 'La fecha final no puede ser anterior a la inicial.'}
            >
              {(control) => (
                <input
                  {...control}
                  type="date"
                  className={controlClassName}
                  value={custom.to}
                  max={today}
                  onChange={(event) => {
                    setCustom({ ...custom, to: event.target.value });
                  }}
                />
              )}
            </Field>
          </div>
        )}
        {valid && (
          <SalesView range={range} inProgress={range.from === range.to && range.to === today} />
        )}
      </div>
      <CashView date={today} />
      {valid && <ExportSection range={range} />}
    </Page>
  );
}

export function ReportsPage() {
  const session = useAdminSession();
  return (
    <AsyncContent query={session} loadingLabel="Verificando acceso…">
      {(current) =>
        current.authenticated ? (
          <ReportsContent />
        ) : (
          <PinLoginForm
            title="Reportes y caja"
            description="Ingresa el PIN de encargado para ver las ventas y cerrar la caja."
          />
        )
      }
    </AsyncContent>
  );
}
