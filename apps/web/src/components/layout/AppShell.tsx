import { Outlet, useLocation } from 'react-router';
import { useNavBadges } from '../../hooks/useNavBadges';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import styles from './AppShell.module.css';
import { BottomBar } from './BottomBar';
import { TopNav } from './TopNav';

export function AppShell() {
  const connection = useRealtimeSync();
  const badges = useNavBadges();
  const { pathname } = useLocation();

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#contenido">
        Saltar al contenido
      </a>
      <TopNav connection={connection} badges={badges} />
      <main id="contenido" key={pathname} className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <BottomBar badges={badges} />
    </div>
  );
}
