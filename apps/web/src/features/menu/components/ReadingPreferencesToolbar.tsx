import { Contrast, Type } from 'lucide-react';
import type { ReadingPreferences } from '../useReadingPreferences';
import styles from './ReadingPreferencesToolbar.module.css';

export interface ReadingPreferencesToolbarProps {
  preferences: ReadingPreferences;
  onToggleLargeText: () => void;
  onToggleHighContrast: () => void;
}

function describeActive({ largeText, highContrast }: ReadingPreferences): string | null {
  if (largeText && highContrast) return 'Alto contraste y texto grande activados';
  if (highContrast) return 'Alto contraste activado';
  if (largeText) return 'Texto grande activado';
  return null;
}

export function ReadingPreferencesToolbar({
  preferences,
  onToggleLargeText,
  onToggleHighContrast,
}: ReadingPreferencesToolbarProps) {
  const activeDescription = describeActive(preferences);

  return (
    <div className={styles.toolbar} role="group" aria-label="Preferencias de lectura">
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={preferences.largeText}
        onClick={onToggleLargeText}
      >
        <Type size={18} aria-hidden="true" />
        Agrandar texto
      </button>
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={preferences.highContrast}
        onClick={onToggleHighContrast}
      >
        <Contrast size={18} aria-hidden="true" />
        Alto contraste
      </button>
      <p className={activeDescription ? styles.notice : 'visually-hidden'} role="status">
        {activeDescription}
      </p>
    </div>
  );
}
