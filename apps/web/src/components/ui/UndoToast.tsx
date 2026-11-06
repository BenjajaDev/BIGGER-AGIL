import { Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import styles from './UndoToast.module.css';

export const UNDO_WINDOW_MS = 8000;

export interface UndoToastProps {
  message: string;
  onUndo: () => void;
  /** The window to undo ran out (or the toast was replaced): the change is final. */
  onExpire: () => void;
  durationMs?: number;
}

/**
 * Reversible actions happen at once and offer «Deshacer» for a few seconds, instead of asking
 * for confirmation first. The countdown pauses while the person hovers or focuses the toast.
 */
export function UndoToast({
  message,
  onUndo,
  onExpire,
  durationMs = UNDO_WINDOW_MS,
}: UndoToastProps) {
  const [paused, setPaused] = useState(false);
  const expire = useRef(onExpire);
  expire.current = onExpire;

  useEffect(() => {
    if (paused) return undefined;
    const timer = window.setTimeout(() => {
      expire.current();
    }, durationMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [paused, durationMs]);

  return (
    <div
      role="status"
      className={styles.toast}
      onMouseEnter={() => {
        setPaused(true);
      }}
      onMouseLeave={() => {
        setPaused(false);
      }}
      onFocus={() => {
        setPaused(true);
      }}
      onBlur={() => {
        setPaused(false);
      }}
    >
      <span className={styles.message}>{message}</span>
      <button type="button" className={styles.undo} onClick={onUndo}>
        <Undo2 size={18} aria-hidden="true" />
        Deshacer
      </button>
    </div>
  );
}
