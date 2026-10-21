import { FieldError } from '../../../components/form/Field';
import styles from '../CatalogAdmin.module.css';

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className={styles.formAlert}>
      <FieldError message={message} />
    </div>
  );
}
