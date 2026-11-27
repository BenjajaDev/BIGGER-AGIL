import { X } from 'lucide-react';
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../lib/cx';
import { Button } from './Button';
import styles from './Sheet.module.css';

const FooterSlot = createContext<HTMLElement | null>(null);

/**
 * Lets content inside the sheet fill the sticky footer, for actions whose label depends on the
 * content's own state («Guardar llegada · +5 kg»).
 */
export function SheetFooter({ children }: { children: ReactNode }) {
  const slot = useContext(FooterSlot);
  return slot ? createPortal(children, slot) : null;
}

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Sticky action bar; on phones it sits above the safe area. */
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

/**
 * Native modal `<dialog>`: a bottom sheet on phones and a side panel from 48rem up. Focus
 * trapping, inert background, Esc and returning focus to the opener come from the browser.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const titleId = useId();
  const descriptionId = useId();
  const [footerSlot, setFooterSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Clicks on the backdrop land on the dialog itself: its content fills the whole box.
  const onBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop click is a pointer shortcut; Esc and the close button cover the keyboard
    <dialog
      ref={dialogRef}
      className={cx(styles.sheet, size === 'lg' && styles.lg)}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={onBackdropClick}
      // A dialog opened inside the sheet (a confirmation) reports its own cancel/close here too.
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        onClose();
      }}
      onClose={(event) => {
        if (event.target === event.currentTarget && openRef.current) onClose();
      }}
    >
      <div className={styles.frame}>
        <span className={styles.handle} aria-hidden="true" />
        <header className={styles.header}>
          <div className={styles.heading}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className={styles.description}>
                {description}
              </p>
            )}
          </div>
          <Button variant="ghost" iconOnly aria-label="Cerrar" onClick={onClose}>
            <X size={22} aria-hidden="true" />
          </Button>
        </header>
        <FooterSlot.Provider value={footerSlot}>
          <div className={styles.body}>{children}</div>
        </FooterSlot.Provider>
        <footer ref={setFooterSlot} className={styles.footer}>
          {footer}
        </footer>
      </div>
    </dialog>
  );
}
