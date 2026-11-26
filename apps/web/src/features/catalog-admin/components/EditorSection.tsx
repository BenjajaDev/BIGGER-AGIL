import type { ReactNode } from 'react';
import { Card } from '../../../components/ui/Card';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import styles from '../CatalogAdmin.module.css';

export interface EditorSectionProps {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

/** A card of the editors with its own h2: one pattern for every form block. */
export function EditorSection({ id, title, description, children }: EditorSectionProps) {
  return (
    <Card as="section" className={styles.formCard} aria-labelledby={id}>
      <SectionHeader id={id} title={title} description={description} />
      {children}
    </Card>
  );
}
