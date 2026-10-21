import { Wifi, WifiOff } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { APP_MODULES } from '../../app/navigation';
import { cx } from '../../lib/cx';
import type { RealtimeConnectionState } from '../../services/realtime.service';
import styles from './TopNav.module.css';

interface TopNavProps {
  connection: RealtimeConnectionState;
}

function ConnectionIndicator({ state }: { state: RealtimeConnectionState }) {
  const isOnline = state === 'open';
  const Icon = isOnline ? Wifi : WifiOff;
  return (
    <span
      role="status"
      className={cx(styles.connection, !isOnline && styles.offline)}
      title={isOnline ? 'En línea' : undefined}
    >
      <Icon size={18} aria-hidden="true" />
      {/* Online is the quiet default; losing the connection is spelled out for everyone. */}
      <span className={isOnline ? 'visually-hidden' : undefined}>
        {isOnline ? 'En línea' : 'Reconectando…'}
      </span>
    </span>
  );
}

export function TopNav({ connection }: TopNavProps) {
  return (
    <header className={styles.bar}>
      <Link to="/mesas" className={styles.brand} aria-label="BIGGER Ágil, ir a Mesas">
        BIGGER
      </Link>
      <nav className={styles.nav} aria-label="Módulos">
        <ul role="list" className={styles.list}>
          {APP_MODULES.map(({ path, label, icon: Icon, status }) => (
            <li key={path}>
              <NavLink to={path} className={styles.link}>
                <Icon size={18} aria-hidden="true" />
                {label}
                {status === 'in-development' && (
                  <span className={styles.devTag}>
                    <span aria-hidden="true">Pronto</span>
                    <span className="visually-hidden">, en desarrollo</span>
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <ConnectionIndicator state={connection} />
    </header>
  );
}
