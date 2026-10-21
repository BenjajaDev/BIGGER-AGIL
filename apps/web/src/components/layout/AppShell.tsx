import { Outlet, useLocation } from 'react-router';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import styles from './AppShell.module.css';
import { TopNav } from './TopNav';

export function AppShell() {
  const connection = useRealtimeSync();
  const { pathname } = useLocation();

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#contenido">
        Saltar al contenido
      </a>
      <TopNav connection={connection} />
      <main id="contenido" key={pathname} className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
