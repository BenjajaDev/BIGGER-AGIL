import { useEffect, useId, useRef, type ReactNode } from 'react';
import { FieldError } from '../form/Field';
import { Button } from './Button';
import styles from './ConfirmDialog.module.css';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isPending?: boolean;
  /** Blocks the confirmation until the extra fields are valid. */
  confirmDisabled?: boolean;
  error?: string | null;
  /** Extra fields, e.g. the reason for voiding a payment. */
  children?: ReactNode;
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
  confirmDisabled = false,
  error = null,
  children,
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
        {children}
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
          <Button variant="primary" onClick={onConfirm} disabled={isPending || confirmDisabled}>
            {isPending ? 'Procesando…' : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
