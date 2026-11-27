import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './SectionHeader.module.css';

export interface SectionHeaderProps {
  title: string;
  level?: 2 | 3;
  id?: string;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: LucideIcon;
}

export function SectionHeader({
  title,
  level = 2,
  id,
  description,
  actions,
  icon: Icon,
}: SectionHeaderProps) {
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <div className={styles.header}>
      <div className={styles.text}>
        <Heading id={id} className={styles.title}>
          {Icon && <Icon size={20} aria-hidden="true" />}
          {title}
        </Heading>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
