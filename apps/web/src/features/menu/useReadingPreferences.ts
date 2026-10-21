import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';

const STORAGE_KEY = 'bigger.carta.preferencias';

const ReadingPreferencesSchema = z.object({
  largeText: z.boolean(),
  highContrast: z.boolean(),
});
export type ReadingPreferences = z.infer<typeof ReadingPreferencesSchema>;

const DEFAULT_PREFERENCES: ReadingPreferences = { largeText: false, highContrast: false };

function readStoredPreferences(): ReadingPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = ReadingPreferencesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/** Per-device convenience: remembered locally, the menu works the same without storage. */
export function useReadingPreferences() {
  const [preferences, setPreferences] = useState(readStoredPreferences);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Storage unavailable (private mode, blocked): preferences stay in memory.
    }
  }, [preferences]);

  const toggleLargeText = useCallback(() => {
    setPreferences((current) => ({ ...current, largeText: !current.largeText }));
  }, []);

  const toggleHighContrast = useCallback(() => {
    setPreferences((current) => ({ ...current, highContrast: !current.highContrast }));
  }, []);

  return { preferences, toggleLargeText, toggleHighContrast };
}
