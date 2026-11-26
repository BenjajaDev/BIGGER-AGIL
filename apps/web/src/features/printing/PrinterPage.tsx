import type { PrinterStatus, PrintJob, PrintJobStatus } from '@bigger/shared';
import {
  CircleCheck,
  CircleDashed,
  CircleX,
  LoaderCircle,
  Printer,
  PrinterCheck,
  PrinterX,
  RotateCw,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { StatusBadge, type StatusTone } from '../../components/ui/StatusBadge';
import { cx } from '../../lib/cx';
import { formatClockTime, pluralize } from '../../lib/format';
import { FieldError } from '../../components/form/Field';
import { ApiRequestError } from '../../services/http-client';
import { TicketPreview } from './components/TicketPreview';
import { describeHealth, printerHealth } from './printer-health';
import styles from './PrinterPage.module.css';
import { sampleKitchenTicket } from './sample-ticket';
import { usePrintJobs, usePrinterStatus, usePrintTest, useReprintOrder } from './usePrinter';

const DEFAULT_COLUMNS = 32;

const JOB_STATUS: Record<PrintJobStatus, { label: string; tone: StatusTone; icon: LucideIcon }> = {
  pending: { label: 'En cola', tone: 'neutral', icon: CircleDashed },
  printing: { label: 'Imprimiendo', tone: 'accent', icon: LoaderCircle },
  printed: { label: 'Impresa', tone: 'success', icon: CircleCheck },
  failed: { label: 'Falló', tone: 'warning', icon: CircleX },
};

const PATH_EXAMPLES = [
  ['Bluetooth en Windows', 'COM5'],
  ['Bluetooth en Linux', '/dev/rfcomm0'],
  ['USB en Linux', '/dev/usb/lp0'],
  ['USB en Windows', '\\\\localhost\\NOMBRE_COMPARTIDO'],
] as const;

function DisabledNotice() {
  return (
    <Card as="section" className={cx(styles.card, styles.disabled)} aria-labelledby="como-activar">
      <SectionHeader id="como-activar" icon={PrinterX} title="La impresión está desactivada" />
      <div>
        <StatusBadge tone="warning" icon={TriangleAlert} label="No se imprimen comandas" />
      </div>
      <p>
        En el equipo donde corre la API, abre el archivo <code>.env</code> y agrega estas dos
        líneas. Luego reinicia la API.
      </p>
      <pre className={styles.code}>{'PRINTER_ENABLED=true\nPRINTER_PATH=COM5'}</pre>
      <p>
        <code>PRINTER_PATH</code> es el lugar donde el sistema operativo deja la impresora:
      </p>
      <ul role="list" className={styles.examples}>
        {PATH_EXAMPLES.map(([how, path]) => (
          <li key={how}>
            <span>{how}</span> <code>{path}</code>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function StatusCard({ status }: { status: PrinterStatus }) {
  const test = usePrintTest();
  const health = printerHealth(status);
  const rows = [
    ['Dispositivo', status.device ?? '—'],
    ['Tabla de caracteres', status.codepage],
    ['Columnas', String(status.columns)],
    ['En cola', pluralize(status.pending, 'comanda', 'comandas')],
    ['Sin imprimir', pluralize(status.failed, 'comanda', 'comandas')],
    [
      'Última impresa',
      status.lastPrintedAt ? formatClockTime(status.lastPrintedAt) : 'Aún ninguna',
    ],
  ] as const;
  const testError =
    test.error instanceof ApiRequestError
      ? test.error.message
      : test.error
        ? 'No se pudo enviar la hoja.'
        : null;

  return (
    <Card as="section" className={styles.card} aria-labelledby="estado-impresora">
      <SectionHeader
        id="estado-impresora"
        title="Estado"
        actions={
          <StatusBadge
            tone={health === 'attention' ? 'warning' : health === 'busy' ? 'accent' : 'success'}
            icon={health === 'attention' ? CircleX : PrinterCheck}
            label={describeHealth(status)}
          />
        }
      />
      <dl className={styles.facts}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {status.lastError && (
        <p role="alert" className={styles.problem}>
          <TriangleAlert size={20} aria-hidden="true" />
          {status.lastError}
        </p>
      )}
      <div className={styles.actions}>
        <Button
          variant="secondary"
          disabled={test.isPending}
          onClick={() => {
            test.mutate();
          }}
        >
          <Printer size={18} aria-hidden="true" />
          {test.isPending ? 'Enviando hoja…' : 'Imprimir hoja de prueba'}
        </Button>
      </div>
      <div role="status" className={styles.result}>
        {test.isSuccess && (
          <p>
            Hoja enviada. Revisa que la regla de números llegue al borde del papel y que se vean las
            tildes y la ñ.
          </p>
        )}
      </div>
      {testError && (
        <div role="alert">
          <FieldError message={testError} />
        </div>
      )}
    </Card>
  );
}

function JobsCard({ jobs }: { jobs: readonly PrintJob[] }) {
  const reprint = useReprintOrder();
  return (
    <Card as="section" className={styles.card} aria-labelledby="trabajos-impresion">
      <SectionHeader id="trabajos-impresion" title="Comandas recientes" />
      {jobs.length === 0 ? (
        <p className={styles.muted}>Todavía no se ha enviado ninguna comanda a la impresora.</p>
      ) : (
        <ul role="list" className={styles.jobs}>
          {jobs.slice(0, 20).map((job) => {
            const status = JOB_STATUS[job.status];
            return (
              <li key={job.id} className={styles.job}>
                <div className={styles.jobMain}>
                  <span className={styles.jobTitle}>
                    {job.label}
                    {job.copy > 1 && (
                      <span className={styles.muted}> · reimpresión {job.copy - 1}</span>
                    )}
                  </span>
                  <span className={styles.muted}>
                    {formatClockTime(job.printedAt ?? job.createdAt)}
                    {job.lastError && job.status !== 'printed' ? ` · ${job.lastError}` : ''}
                  </span>
                </div>
                <StatusBadge tone={status.tone} icon={status.icon} label={status.label} />
                <Button
                  variant="secondary"
                  disabled={reprint.isPending}
                  onClick={() => {
                    reprint.mutate(job.orderId);
                  }}
                >
                  <RotateCw size={18} aria-hidden="true" />
                  Reimprimir<span className="visually-hidden"> comanda de {job.label}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {reprint.error && (
        <div role="alert">
          <FieldError
            message={
              reprint.error instanceof ApiRequestError
                ? reprint.error.message
                : 'No se pudo reimprimir.'
            }
          />
        </div>
      )}
    </Card>
  );
}

/** Where the manager checks that the comanda printer works and how its tickets will look. */
export function PrinterPage() {
  const statusQuery = usePrinterStatus();
  const enabled = statusQuery.data?.enabled ?? false;
  const jobsQuery = usePrintJobs(enabled);
  const columns = statusQuery.data?.columns ?? DEFAULT_COLUMNS;

  return (
    <section className={styles.page}>
      <PageHeader
        title="Impresora de comandas"
        subtitle="Cada pedido nuevo imprime su comanda en la cocina, sin precios, con la mesa y los productos en letra grande."
      />
      <AsyncContent query={statusQuery} loadingLabel="Consultando la impresora…">
        {(status) => (
          <div className={styles.layout}>
            <div className={styles.column}>
              {status.enabled ? <StatusCard status={status} /> : <DisabledNotice />}
              {status.enabled && (
                <AsyncContent query={jobsQuery} loadingLabel="Cargando comandas…">
                  {(jobs) => <JobsCard jobs={jobs} />}
                </AsyncContent>
              )}
            </div>
            <Card as="section" className={styles.card} aria-labelledby="vista-previa-ticket">
              <SectionHeader
                id="vista-previa-ticket"
                title="Así sale la comanda"
                description={`Pedido de ejemplo a ${String(columns)} columnas.`}
              />
              <TicketPreview
                lines={sampleKitchenTicket(columns)}
                columns={columns}
                label="Vista previa de una comanda impresa"
              />
            </Card>
          </div>
        )}
      </AsyncContent>
    </section>
  );
}
