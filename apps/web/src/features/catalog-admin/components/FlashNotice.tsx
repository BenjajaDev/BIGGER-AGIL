import { CircleCheck } from 'lucide-react';
import styles from '../CatalogAdmin.module.css';
import { useFlashNotice } from '../useFlashNotice';

export function FlashNotice() {
  const notice = useFlashNotice();
  return (
    <div role="status">
      {notice && (
        <p className={styles.notice}>
          <CircleCheck size={20} aria-hidden="true" />
          {notice}
        </p>
      )}
    </div>
  );
}
