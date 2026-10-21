import { Save } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, ButtonLink } from '../../../components/ui/Button';
import styles from '../CatalogAdmin.module.css';

export interface SaveBarProps {
  cancelTo: string;
  isPending: boolean;
  extra?: ReactNode;
}

export function SaveBar({ cancelTo, isPending, extra }: SaveBarProps) {
  return (
    <div className={styles.saveBar}>
      {extra}
      <ButtonLink to={cancelTo} variant="secondary">
        Cancelar
      </ButtonLink>
      <Button type="submit" variant="primary" size="lg" disabled={isPending}>
        <Save size={20} aria-hidden="true" />
        {isPending ? 'Guardando…' : 'Guardar'}
      </Button>
    </div>
  );
}
