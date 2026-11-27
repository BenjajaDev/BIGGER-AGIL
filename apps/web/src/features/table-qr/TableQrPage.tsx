import type { TableQr } from '@bigger/shared';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer, RefreshCw } from 'lucide-react';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageHeader } from '../../components/ui/PageHeader';
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
  const [confirming, setConfirming] = useState(false);
  const rotate = useMutation({
    mutationFn: () => tableQrService.regenerate(table.id),
    retry: false,
    onSuccess: (tables) => {
      queryClient.setQueryData(KEY, tables);
      setConfirming(false);
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
          setConfirming(true);
        }}
      >
        <RefreshCw size={18} aria-hidden="true" />
        QR nuevo<span className="visually-hidden"> para {table.label}</span>
      </Button>
      <ConfirmDialog
        open={confirming}
        title={`¿Generar un QR nuevo para ${table.label}?`}
        description="El QR impreso dejará de funcionar y tendrás que imprimir y cambiar el de la mesa."
        confirmLabel="Generar QR nuevo"
        isPending={rotate.isPending}
        error={rotate.error?.message ?? null}
        onClose={() => {
          setConfirming(false);
          rotate.reset();
        }}
        onConfirm={() => {
          rotate.mutate();
        }}
      />
    </Card>
  );
}

export function TableQrPage() {
  const query = useQuery({ queryKey: KEY, queryFn: ({ signal }) => tableQrService.list(signal) });
  return (
    <section className={styles.page}>
      <PageHeader
        title="QR por mesa"
        subtitle="Cada mesa tiene su propio código. Al escanearlo, el cliente ve la carta y el nombre de su mesa. Si un QR se pierde o se filtra, genera uno nuevo."
        actions={
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
        }
      />
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
