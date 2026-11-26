import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { cx } from '../../lib/cx';
import styles from './PageHeader.module.css';

export interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  back?: { to: string; label: string };
  actions?: ReactNode;
  titleId?: string;
  hideTitle?: boolean;
  documentTitle?: string;
}

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  titleId,
  hideTitle = false,
  documentTitle,
}: PageHeaderProps) {
  useDocumentTitle(documentTitle ?? `${title} · BIGGER`);

  return (
    <header className={styles.header}>
      {back && (
        <Link to={back.to} className={styles.back}>
          <ArrowLeft size={18} aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className={styles.row}>
        <div className={styles.text}>
          <h1 id={titleId} className={cx(styles.title, hideTitle && 'visually-hidden')}>
            {title}
          </h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
}
