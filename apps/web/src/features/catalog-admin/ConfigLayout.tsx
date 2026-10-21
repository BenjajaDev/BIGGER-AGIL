import {
  Combine,
  ExternalLink,
  FolderTree,
  LogOut,
  Package,
  SlidersHorizontal,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { Button, ButtonLink } from '../../components/ui/Button';
import { PinLoginForm } from './components/PinLoginForm';
import styles from './ConfigLayout.module.css';
import { useAdminSession, useLogout } from './useCatalogAdmin';

const SECTIONS = [
  { to: 'productos', label: 'Productos', icon: Package },
  { to: 'combos', label: 'Combos', icon: Combine },
  { to: 'personalizaciones', label: 'Personalizaciones', icon: SlidersHorizontal },
  { to: 'categorias', label: 'Categorías', icon: FolderTree },
] as const;

export function ConfigLayout() {
  const sessionQuery = useAdminSession();
  const logout = useLogout();

  return (
    <AsyncContent query={sessionQuery} loadingLabel="Verificando acceso…">
      {(session) =>
        !session.authenticated ? (
          <PinLoginForm />
        ) : (
          <div className={styles.layout}>
            <div className={styles.bar}>
              <nav aria-label="Secciones de configuración">
                <ul role="list" className={styles.tabs}>
                  {SECTIONS.map(({ to, label, icon: Icon }) => (
                    <li key={to}>
                      <NavLink to={to} className={styles.tab}>
                        <Icon size={18} aria-hidden="true" />
                        {label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className={styles.tools}>
                <ButtonLink to="/carta" target="_blank" rel="noopener" variant="ghost">
                  <ExternalLink size={18} aria-hidden="true" />
                  Ver carta pública
                  <span className="visually-hidden"> (se abre en otra pestaña)</span>
                </ButtonLink>
                <Button
                  variant="ghost"
                  onClick={() => {
                    logout.mutate();
                  }}
                  disabled={logout.isPending}
                >
                  <LogOut size={18} aria-hidden="true" />
                  Cerrar sesión
                </Button>
              </div>
            </div>
            <Outlet />
          </div>
        )
      }
    </AsyncContent>
  );
}
