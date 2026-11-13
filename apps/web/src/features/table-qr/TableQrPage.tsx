import type { TableQr } from '@bigger/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer, RefreshCw } from 'lucide-react';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { tableQrService } from '../../services/table-qr.service';
import { QrImage } from './QrImage';
import styles from './TableQrPage.module.css';

const KEY = ['admin', 'tables', 'qr'] as const;

/** The address the QR opens: the public menu of this same system, tagged with the table. */
function tableMenuUrl(token: string): string {
  return `${window.location.origin}/carta?mesa=${token}`;
}

function QrCard({ table }: { table: TableQr }) {
  const queryClient = useQueryClient();
  const rotate = useMutation({
    mutationFn: () => tableQrService.regenerate(table.id),
    retry: false,
    onSuccess: (tables) => {
      queryClient.setQueryData(KEY, tables);
    },
  });
  return (
    <Card as="li" className={styles.card}>
      <h2 className={styles.label}>{table.label}</h2>
      <QrImage
        value={tableMenuUrl(table.token)}
        label={`Código QR de la carta para ${table.label}`}
      />
      <p className={styles.hint}>Escanea para ver la carta</p>
      <Button
        variant="ghost"
        className={styles.noPrint}
        disabled={rotate.isPending}
        onClick={() => {
          if (
            window.confirm(
              `¿Generar un QR nuevo para ${table.label}? El QR impreso dejará de funcionar.`,
            )
          ) {
            rotate.mutate();
          }
        }}
      >
        <RefreshCw size={18} aria-hidden="true" />
        QR nuevo<span className="visually-hidden"> para {table.label}</span>
      </Button>
    </Card>
  );
}

export function TableQrPage() {
  const query = useQuery({ queryKey: KEY, queryFn: ({ signal }) => tableQrService.list(signal) });
  return (
    <section className={styles.page} aria-labelledby="qr-titulo">
      <div className={styles.head}>
        <h1 id="qr-titulo" className={styles.title}>
          QR por mesa
        </h1>
        <Button
          variant="primary"
          className={styles.noPrint}
          onClick={() => {
            window.print();
          }}
        >
          <Printer size={20} aria-hidden="true" />
          Imprimir los QR
        </Button>
      </div>
      <p className={styles.lead}>
        Cada mesa tiene su propio código. Al escanearlo, el cliente ve la carta y el nombre de su
        mesa. Si un QR se pierde o se filtra, genera uno nuevo.
      </p>
      <AsyncContent query={query} loadingLabel="Preparando los QR…">
        {(tables) => (
          <ul role="list" className={styles.grid}>
            {tables.map((table) => (
              <QrCard key={table.id} table={table} />
            ))}
          </ul>
        )}
      </AsyncContent>
    </section>
  );
}
