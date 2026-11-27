import type { SystemInfo } from '@bigger/shared';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { queryKeys } from '../../app/query-keys';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { systemService } from '../../services/system.service';
import { QrImage } from '../table-qr/QrImage';
import styles from './ConnectDevicesPage.module.css';
import { copyText } from './copy-text';

const COPIED_MS = 2_500;

const STEPS = [
  'Conecta la tablet o el celular al Wi-Fi del local.',
  'Escanea el código o escribe la dirección.',
  'Agrégala a la pantalla de inicio para abrirla como app.',
] as const;

const HELP = [
  'Revisa que esté en el mismo Wi-Fi que este computador, no en datos móviles ni en el Wi-Fi de invitados.',
  'Si aparece más de una dirección, prueba con la siguiente.',
  'Si ninguna abre, vuelve a ejecutar el instalador de BIGGER Ágil: deja abierto el acceso en el firewall de Windows.',
] as const;

function AddressCard({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => {
      setCopied(false);
    }, COPIED_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [copied]);

  return (
    <Card as="li" className={styles.address}>
      <QrImage value={address} label={`Código QR para abrir ${address}`} />
      <div className={styles.url}>
        <p className={styles.value}>{address}</p>
        <Button
          variant="secondary"
          onClick={() => {
            void copyText(address).then(setCopied);
          }}
        >
          {copied ? <Check size={20} aria-hidden="true" /> : <Copy size={20} aria-hidden="true" />}
          {copied ? 'Copiada' : 'Copiar'}
          <span className="visually-hidden"> la dirección {address}</span>
        </Button>
        <p role="status" className="visually-hidden">
          {copied ? 'Dirección copiada' : ''}
        </p>
      </div>
    </Card>
  );
}

function Addresses({ info }: { info: SystemInfo }) {
  if (info.addresses.length === 0) {
    return (
      <EmptyState
        icon={WifiOff}
        title="Este equipo no está conectado a una red"
        description="Conéctalo al Wi-Fi o al cable de red del local y vuelve a abrir esta pantalla."
      />
    );
  }
  return (
    <>
      <ul role="list" className={styles.list}>
        {info.addresses.map((address) => (
          <AddressCard key={address} address={address} />
        ))}
      </ul>
      <Card as="section" aria-labelledby="no-abre" className={styles.steps}>
        <SectionHeader id="no-abre" title="¿No abre en el celular?" />
        <ul className={styles.stepList}>
          {HELP.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </Card>
    </>
  );
}

export function ConnectDevicesPage() {
  const query = useQuery({
    queryKey: queryKeys.systemInfo,
    queryFn: ({ signal }) => systemService.info(signal),
  });
  return (
    <section className={styles.page}>
      <PageHeader
        title="Conectar equipos"
        subtitle="Abre BIGGER Ágil en las tablets y celulares del local, sin instalar nada."
      />
      <Card as="section" aria-labelledby="como-conectar" className={styles.steps}>
        <SectionHeader id="como-conectar" title="Cómo conectarlos" />
        <ol className={styles.stepList}>
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Card>
      <AsyncContent query={query} loadingLabel="Buscando la dirección del equipo…">
        {(info) => <Addresses info={info} />}
      </AsyncContent>
    </section>
  );
}
