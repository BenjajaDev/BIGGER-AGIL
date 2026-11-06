import type { AppModule } from '../../app/navigation';
import type { NavBadgeCounts } from '../../hooks/useNavBadges';
import styles from './NavBadge.module.css';

/** The live count of a module (e.g. tables to charge); hidden at zero. The number is read in words too. */
export function NavBadge({ module, counts }: { module: AppModule; counts: NavBadgeCounts }) {
  const count = module.badge ? counts[module.badge.key] : undefined;
  if (!module.badge || !count) return null;
  return (
    <>
      <span className={styles.badge} aria-hidden="true">
        {count > 99 ? '99+' : count}
      </span>
      <span className="visually-hidden">, {module.badge.describe(count)}</span>
    </>
  );
}
