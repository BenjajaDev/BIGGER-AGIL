import { Printer, RotateCw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { formatClockTime } from '../../../lib/format';
import { usePrintJobs, useReprintOrder } from '../../printing/usePrinter';
import styles from './LastTicketCard.module.css';

/** The last comanda that came out of the printer, with «Reimprimir». Absent while printing is off. */
export function LastTicketCard() {
  const jobs = usePrintJobs(true);
  const reprint = useReprintOrder();
  const last = jobs.data?.find((job) => job.status === 'printed' && job.printedAt);
  if (!last?.printedAt) return null;

  return (
    <Card as="section" aria-labelledby="ultima-comanda-titulo" className={styles.card}>
      <h2 id="ultima-comanda-titulo" className={styles.title}>
        <Printer size={20} aria-hidden="true" />
        Última comanda impresa
      </h2>
      <p className={styles.line}>
        <strong>{last.label}</strong>
        <span>{formatClockTime(last.printedAt)}</span>
      </p>
      <Button
        variant="ghost"
        disabled={reprint.isPending}
        onClick={() => {
          reprint.mutate(last.orderId);
        }}
      >
        <RotateCw size={18} aria-hidden="true" />
        Reimprimir
        <span className="visually-hidden"> comanda de {last.label}</span>
      </Button>
    </Card>
  );
}
