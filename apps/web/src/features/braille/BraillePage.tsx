import type { BraillePlate } from '@bigger/shared';
import { useQuery } from '@tanstack/react-query';
import { CircleCheck, Download, Hand } from 'lucide-react';
import { queryKeys } from '../../app/query-keys';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionHeader } from '../../components/ui/SectionHeader';
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
        <h3 className={styles.plateTitle}>{title}</h3>
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
    <section className={styles.page}>
      <PageHeader
        title="Carta braille para imprimir en 3D"
        subtitle="Cada categoría de la carta se convierte en una placa de 150 × 140 mm con el nombre y el precio de cada producto en braille español grado 1. Si cambia un precio, vuelve a descargar solo esa placa."
      />
      <Card as="section" className={styles.tips} aria-labelledby="braille-antes">
        <SectionHeader id="braille-antes" icon={Hand} title="Antes de imprimir" />
        <ul role="list" className={styles.tipList}>
          <li>
            <CircleCheck size={18} aria-hidden="true" />
            Imprime la placa con los puntos hacia arriba, capa de 0,1–0,12 mm, boquilla de 0,4 mm,
            al menos 3 perímetros y sin «planchado» (ironing).
          </li>
          <li>
            <CircleCheck size={18} aria-hidden="true" />
            Baja la velocidad de las últimas capas para que los puntos queden firmes.
          </li>
          <li>
            <CircleCheck size={18} aria-hidden="true" />
            Bambu Studio (A1): perfil 0.12 mm Fine, 3 paredes, sin planchado. Ender-3 V3 SE
            (Creality Print o Cura): altura de capa 0,12 mm, 3 paredes, sin planchado.
          </li>
          <li>
            <CircleCheck size={18} aria-hidden="true" />
            El marco de la esquina superior derecha marca dónde pegar el código QR de la carta
            digital.
          </li>
          <li>
            <CircleCheck size={18} aria-hidden="true" />
            Pide a una persona lectora de braille que revise la primera placa antes de imprimir el
            resto.
          </li>
        </ul>
      </Card>
      <SectionHeader title="Placas por categoría" level={2} />
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
