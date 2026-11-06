import { Wifi, WifiOff } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router';
import {
  groupOf,
  modulesIn,
  NAV_GROUPS,
  type AppModule,
  type NavGroup,
} from '../../app/navigation';
import { cx } from '../../lib/cx';
import { PrinterIndicator } from '../../features/printing/components/PrinterIndicator';
import type { NavBadgeCounts } from '../../hooks/useNavBadges';
import type { RealtimeConnectionState } from '../../services/realtime.service';
import { NavBadge } from './NavBadge';
import styles from './TopNav.module.css';

interface TopNavProps {
  connection: RealtimeConnectionState;
  badges: NavBadgeCounts;
}

const GROUPS = Object.keys(NAV_GROUPS) as NavGroup[];

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

function ModuleTab({ module, badges }: { module: AppModule; badges: NavBadgeCounts }) {
  const Icon = module.icon;
  return (
    <NavLink to={module.path} end={module.path === '/'} viewTransition className={styles.tab}>
      <Icon size={18} aria-hidden="true" />
      {module.label}
      <NavBadge module={module} counts={badges} />
      {module.status === 'in-development' && (
        <span className={styles.devTag}>
          <span aria-hidden="true">Pronto</span>
          <span className="visually-hidden">, en desarrollo</span>
        </span>
      )}
    </NavLink>
  );
}

export function TopNav({ connection, badges }: TopNavProps) {
  const { pathname } = useLocation();
  const activeGroup = groupOf(pathname);

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link to="/" className={styles.brand} aria-label="BIGGER Ágil, ir al Resumen">
          BIGGER
        </Link>
        <nav className={styles.areas} aria-label="Áreas">
          {GROUPS.map((group) => {
            const first = modulesIn(group)[0];
            return first ? (
              <Link
                key={group}
                to={first.path}
                viewTransition
                className={styles.area}
                aria-current={group === activeGroup ? 'true' : undefined}
              >
                {NAV_GROUPS[group].label}
              </Link>
            ) : null;
          })}
        </nav>
        <div className={styles.status}>
          <PrinterIndicator />
          <ConnectionIndicator state={connection} />
        </div>
      </div>
      <nav className={styles.subnav} aria-label={NAV_GROUPS[activeGroup].label}>
        <ul role="list" className={styles.tabs}>
          {modulesIn(activeGroup).map((module) => (
            <li key={module.path}>
              <ModuleTab module={module} badges={badges} />
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
