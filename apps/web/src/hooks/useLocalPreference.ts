import { useCallback, useState } from 'react';

function read(key: string, fallback: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? fallback : stored === 'true';
  } catch {
    return fallback;
  }
}

/** A yes/no choice remembered on this device (the kitchen tablet keeps its own). Never throws. */
export function useLocalPreference(key: string, fallback = false) {
  const [value, setValue] = useState(() => read(key, fallback));
  const update = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, String(next));
      } catch {
        // Private mode or blocked storage: the choice just lasts until the page closes.
      }
    },
    [key],
  );
  return [value, update] as const;
}
