import type { Supply } from '@bigger/shared';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { MOVEMENT_LABELS, formatSigned, relativeTime } from '../supply-text';
import { useSupplyMovements } from '../useInventory';
import styles from './Ficha.module.css';

export function MovementHistory({ supply }: { supply: Pick<Supply, 'id' | 'unit'> }) {
  const movements = useSupplyMovements(supply.id);
  const now = new Date();
  return (
    <section className={styles.history} aria-labelledby="movimientos-titulo">
      <SectionHeader id="movimientos-titulo" title="Últimos movimientos" level={3} />
      {movements.isPending ? (
        <p className={styles.movementMeta}>Cargando…</p>
      ) : movements.isError ? (
        <p className={styles.movementMeta}>No se pudo cargar el historial.</p>
      ) : movements.data.length === 0 ? (
        <p className={styles.movementMeta}>Todavía no hay movimientos de este insumo.</p>
      ) : (
        <ul role="list" className={styles.movements}>
          {movements.data.map((movement) => (
            <li key={movement.id} className={styles.movement}>
              <span className={styles.movementKind}>{MOVEMENT_LABELS[movement.kind]}</span>
              <span className={styles.movementMeta}>
                {relativeTime(movement.createdAt, now)}
                {movement.note && ` · ${movement.note}`}
              </span>
              <span className={styles.movementDelta}>
                {formatSigned(movement.delta, supply.unit)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
