import type { BraillePlate } from '@bigger/shared';
import { useQuery } from '@tanstack/react-query';
import { Download, Hand } from 'lucide-react';
import { queryKeys } from '../../app/query-keys';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { brailleService } from '../../services/braille.service';
import styles from './BraillePage.module.css';
import { BraillePlatePreview } from './BraillePlatePreview';

function PlateCard({ plate }: { plate: BraillePlate }) {
  const title =
    plate.parts > 1
      ? `${plate.categoryName} (${String(plate.part)} de ${String(plate.parts)})`
      : plate.categoryName;
  return (
    <Card as="li" className={styles.plate}>
      <div className={styles.preview}>
        <BraillePlatePreview plate={plate} />
      </div>
      <div className={styles.plateHead}>
        <h2 className={styles.plateTitle}>{title}</h2>
        <ButtonLink
          to={brailleService.stlUrl(plate.id)}
          reloadDocument
          download
          variant="secondary"
        >
          <Download size={18} aria-hidden="true" />
          Descargar STL<span className="visually-hidden"> de {title}</span>
        </ButtonLink>
      </div>
    </Card>
  );
}

export function BraillePage() {
  const platesQuery = useQuery({
    queryKey: queryKeys.braillePlates,
    queryFn: ({ signal }) => brailleService.plates(signal),
  });

  return (
    <section className={styles.page} aria-labelledby="braille-titulo">
      <h1 id="braille-titulo" className={styles.title}>
        Carta braille para imprimir en 3D
      </h1>
      <p className={styles.lead}>
        Cada categoría de la carta se convierte en una placa de 150 × 140 mm con el nombre y el
        precio de cada producto en braille español grado 1. Si cambia un precio, vuelve a descargar
        solo esa placa.
      </p>
      <Card className={styles.tips}>
        <h2 className={styles.tipsTitle}>
          <Hand size={20} aria-hidden="true" />
          Antes de imprimir
        </h2>
        <ul role="list" className={styles.tipList}>
          <li>
            Imprime con los puntos hacia arriba y capas de 0,1 mm, para que queden redondeados.
          </li>
          <li>
            El marco de la esquina superior derecha marca dónde pegar el código QR de la carta
            digital.
          </li>
          <li>
            Pide a una persona lectora de braille que revise la primera placa antes de imprimir el
            resto.
          </li>
        </ul>
      </Card>
      <AsyncContent query={platesQuery} loadingLabel="Preparando las placas…">
        {(plates) =>
          plates.length === 0 ? (
            <EmptyState icon={Hand} title="Todavía no hay productos para transcribir" />
          ) : (
            <ul role="list" className={styles.grid}>
              {plates.map((plate) => (
                <PlateCard key={plate.id} plate={plate} />
              ))}
            </ul>
          )
        }
      </AsyncContent>
    </section>
  );
}
