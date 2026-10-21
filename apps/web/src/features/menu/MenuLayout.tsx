import { MessageCircle } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import { webEnv } from '../../config/env';
import { ReadingPreferencesToolbar } from './components/ReadingPreferencesToolbar';
import styles from './MenuLayout.module.css';
import { useReadingPreferences } from './useReadingPreferences';
import { buildWhatsAppOrderUrl } from './whatsapp';

export function MenuLayout() {
  const { preferences, toggleLargeText, toggleHighContrast } = useReadingPreferences();
  const whatsappNumber = webEnv.VITE_WHATSAPP_NUMBER;

  return (
    <div
      className={styles.root}
      data-text-size={preferences.largeText ? 'large' : 'normal'}
      data-contrast={preferences.highContrast ? 'high' : 'normal'}
    >
      <header className={styles.header}>
        <Link to="/carta" className={styles.brand}>
          BIGGER
        </Link>
        <p className={styles.tagline}>Pastelería · Heladería · Café</p>
        <p className={styles.address}>Calle Carmen 752, Curicó</p>
      </header>

      <main className={styles.content}>
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
