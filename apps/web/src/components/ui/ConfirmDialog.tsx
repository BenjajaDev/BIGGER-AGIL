import { useEffect, useId, useRef } from 'react';
import { FieldError } from '../form/Field';
import { Button } from './Button';
import styles from './ConfirmDialog.module.css';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isPending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Native modal `<dialog>` opened with `showModal()`: focus trapping, inert background and
 * Esc / platform back gestures come from the browser. Focus starts on the safe choice.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  isPending = false,
  error = null,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
    >
      <div className={styles.content}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p id={descriptionId} className={styles.description}>
          {description}
        </p>
        {error && (
          <div role="alert">
            <FieldError message={error} />
          </div>
        )}
        <div className={styles.actions}>
          {/* eslint-disable-next-line jsx-a11y/no-autofocus -- initial focus on the non-destructive option */}
          <Button variant="secondary" onClick={onClose} autoFocus>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Procesando…' : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
