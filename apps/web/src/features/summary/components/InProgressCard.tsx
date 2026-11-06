import { Card } from '../../../components/ui/Card';
import { formatClp, pluralize } from '../../../lib/format';
import type { OpenFigures } from '../summary-model';
import styles from './InProgressCard.module.css';

/** Money still on the tables right now. Sales of the day arrive with Reportes. */
export function InProgressCard({ figures }: { figures: OpenFigures }) {
  return (
    <Card as="section" aria-labelledby="en-curso-titulo" className={styles.card}>
      <h2 id="en-curso-titulo" className={styles.title}>
        En curso
      </h2>
      <dl className={styles.figures}>
        <div>
          <dt>Por cobrar</dt>
          <dd className={styles.big}>{formatClp(figures.toCollectClp)}</dd>
        </div>
        <div>
          <dt>Pedido en mesas</dt>
          <dd>{formatClp(figures.openTotalClp)}</dd>
        </div>
        <div>
          <dt>Cuentas abiertas</dt>
          <dd>{pluralize(figures.openChecks, 'mesa', 'mesas')}</dd>
        </div>
      </dl>
    </Card>
  );
}
