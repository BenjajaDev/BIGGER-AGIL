import type { UseQueryResult } from '@tanstack/react-query';
import { CloudOff, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './AsyncContent.module.css';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

export interface AsyncContentProps<T> {
  query: UseQueryResult<T>;
  loadingLabel: string;
  inverse?: boolean;
  children: (data: T) => ReactNode;
}

/** Uniform loading / error handling for every data-driven region. */
export function AsyncContent<T>({
  query,
  loadingLabel,
  inverse = false,
  children,
}: AsyncContentProps<T>) {
  if (query.isPending) {
    return (
      <div role="status" className={cx(styles.status, inverse && styles.inverse)}>
        <LoaderCircle className={styles.spinner} size={20} aria-hidden="true" />
        {loadingLabel}
      </div>
    );
  }

  if (query.isError) {
    return (
      <div role="alert">
        <EmptyState
          icon={CloudOff}
          inverse={inverse}
          title="No pudimos cargar esta información"
          description={query.error.message}
          action={
            <Button variant="secondary" onClick={() => void query.refetch()}>
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  return <>{children(query.data)}</>;
}
