import type { SyntheticEvent, ReactNode } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import styles from './Inventory.module.css';

export interface FormCardProps {
  title: string;
  description?: string;
  submitLabel: string;
  pending?: boolean;
  submitDisabled?: boolean;
  error?: string | null;
  onSubmit: () => void;
  onCancel: () => void;
  children: ReactNode;
}

/** Inline form shell: title, fields in a grid, error and aligned Cancel / Save buttons. */
export function FormCard({
  title,
  description,
  submitLabel,
  pending = false,
  submitDisabled = false,
  error = null,
  onSubmit,
  onCancel,
  children,
}: FormCardProps) {
  const handle = (event: SyntheticEvent) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <Card as="section" aria-label={title} className={styles.formCard}>
      <SectionHeader title={title} level={3} description={description} />
      <form className={styles.form} onSubmit={handle}>
        <div className={styles.formGrid}>{children}</div>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <div className={styles.formActions}>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={pending || submitDisabled}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
