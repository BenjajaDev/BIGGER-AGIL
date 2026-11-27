import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './Lists.module.css';

/** A tappable row: the whole row opens the item; an optional side action sits next to it. */
export function ListRow({
  title,
  meta,
  extra,
  label,
  side,
  onOpen,
}: {
  title: string;
  meta: string;
  extra?: ReactNode;
  /** Accessible name when it should say more than the title. */
  label?: string;
  side?: ReactNode;
  onOpen: () => void;
}) {
  return (
    <li className={styles.rowItem}>
      <button type="button" className={styles.rowButton} aria-label={label} onClick={onOpen}>
        <span className={styles.rowText}>
          <span className={styles.rowTitle}>{title}</span>
          <span className={styles.rowMeta}>{meta}</span>
          {extra}
        </span>
        <ChevronRight className={styles.chevron} size={20} aria-hidden="true" />
      </button>
      {side}
    </li>
  );
}
