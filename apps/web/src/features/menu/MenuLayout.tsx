import { Accessibility, Hand, MapPin, MessageCircle, Utensils } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useSearchParams } from 'react-router';
import { tableQrService } from '../../services/table-qr.service';
import { webEnv } from '../../config/env';
import { ReadingPreferencesToolbar } from './components/ReadingPreferencesToolbar';
import styles from './MenuLayout.module.css';
import { useReadingPreferences } from './useReadingPreferences';
import { buildWhatsAppOrderUrl } from './whatsapp';

export function MenuLayout() {
  const { preferences, toggleLargeText, toggleHighContrast } = useReadingPreferences();
  const whatsappNumber = webEnv.VITE_WHATSAPP_NUMBER;
  const token = useSearchParams()[0].get('mesa');
  const table = useQuery({
    queryKey: ['public', 'table', token],
    queryFn: ({ signal }) => tableQrService.label(token ?? '', signal),
    enabled: token !== null && /^[\w-]{16,64}$/.test(token),
    retry: false,
    staleTime: Infinity,
  });

  return (
    <div
      className={styles.root}
      data-text-size={preferences.largeText ? 'large' : 'normal'}
      data-contrast={preferences.highContrast ? 'high' : 'normal'}
    >
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/carta" className={styles.brand}>
            BIGGER
          </Link>
          <p className={styles.tagline}>Sándwiches · Fajitas · Ensaladas · Pasteles</p>
          <p className={styles.address}>
            <MapPin size={16} aria-hidden="true" />
            Calle Carmen 752, Curicó
          </p>
          <ul className={styles.perks} aria-label="Accesibilidad de la carta">
            <li>
              <Accessibility size={16} aria-hidden="true" />
              Funciona con lector de pantalla
            </li>
            <li>
              <Hand size={16} aria-hidden="true" />
              Pide la carta en braille en el local
            </li>
          </ul>
        </div>
      </header>

      <main className={styles.content}>
        {table.data && (
          <p className={styles.tableBanner}>
            <Utensils size={20} aria-hidden="true" />
            Estás en la {table.data.label}
          </p>
        )}
        <ReadingPreferencesToolbar
          preferences={preferences}
          onToggleLargeText={toggleLargeText}
          onToggleHighContrast={toggleHighContrast}
        />
        <Outlet />
      </main>

      {whatsappNumber && (
        <footer className={styles.footer}>
          <a
            className={styles.whatsapp}
            href={buildWhatsAppOrderUrl(whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={20} aria-hidden="true" />
            Pedir para llevar por WhatsApp
            <span className="visually-hidden"> (se abre en WhatsApp)</span>
          </a>
        </footer>
      )}
    </div>
  );
}
