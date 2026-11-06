import { Ellipsis, Plus, X } from 'lucide-react';
import { useRef } from 'react';
import { Link, NavLink } from 'react-router';
import { APP_MODULES, modulesIn, NAV_GROUPS, type AppModule } from '../../app/navigation';
import type { NavBadgeCounts } from '../../hooks/useNavBadges';
import styles from './BottomBar.module.css';
import { NavBadge } from './NavBadge';

/** Resumen · Mesas · [+ Pedido] · Cocina · Más: the urgent things first, within thumb reach. */
const SIDE_PATHS: readonly [readonly string[], readonly string[]] = [['/', '/mesas'], ['/cocina']];

function findModule(path: string): AppModule | undefined {
  return APP_MODULES.find((module) => module.path === path);
}

function BottomLink({ module, badges }: { module: AppModule; badges: NavBadgeCounts }) {
  const Icon = module.icon;
  return (
    <NavLink to={module.path} end={module.path === '/'} viewTransition className={styles.item}>
      <span className={styles.iconWrap}>
        <Icon size={22} aria-hidden="true" />
        <span className={styles.badgeSlot}>
          <NavBadge module={module} counts={badges} />
        </span>
      </span>
      {module.label}
    </NavLink>
  );
}

function MoreSheet({ dialogRef }: { dialogRef: React.RefObject<HTMLDialogElement | null> }) {
  const close = () => {
    dialogRef.current?.close();
  };
  return (
    <dialog ref={dialogRef} className={styles.sheet} aria-labelledby="mas-titulo">
      <div className={styles.sheetHead}>
        <h2 id="mas-titulo" className={styles.sheetTitle}>
          {NAV_GROUPS.management.label}
        </h2>
        <button type="button" className={styles.close} onClick={close}>
          <X size={22} aria-hidden="true" />
          <span className="visually-hidden">Cerrar</span>
        </button>
      </div>
      <ul role="list" className={styles.sheetList}>
        {modulesIn('management').map((module) => {
          const Icon = module.icon;
          return (
            <li key={module.path}>
              <Link to={module.path} className={styles.sheetLink} onClick={close}>
                <Icon size={22} aria-hidden="true" />
                {module.label}
                {module.status === 'in-development' && (
                  <span className={styles.devTag}>
                    <span aria-hidden="true">Pronto</span>
                    <span className="visually-hidden">, en desarrollo</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </dialog>
  );
}

export function BottomBar({ badges }: { badges: NavBadgeCounts }) {
  const sheetRef = useRef<HTMLDialogElement>(null);
  const [left, right] = SIDE_PATHS.map((paths) => paths.flatMap((path) => findModule(path) ?? []));

  return (
    <>
      <nav className={styles.bar} aria-label="Navegación principal">
        <ul role="list" className={styles.list}>
          {left?.map((module) => (
            <li key={module.path}>
              <BottomLink module={module} badges={badges} />
            </li>
          ))}
          <li className={styles.centre}>
            <Link to="/pedido" viewTransition className={styles.create}>
              <Plus size={26} aria-hidden="true" />
              <span>Pedido</span>
            </Link>
          </li>
          {right?.map((module) => (
            <li key={module.path}>
              <BottomLink module={module} badges={badges} />
            </li>
          ))}
          <li>
            <button
              type="button"
              className={styles.item}
              onClick={() => {
                sheetRef.current?.showModal();
              }}
            >
              <span className={styles.iconWrap}>
                <Ellipsis size={22} aria-hidden="true" />
              </span>
              Más
            </button>
          </li>
        </ul>
      </nav>
      <MoreSheet dialogRef={sheetRef} />
    </>
  );
}
