import type { ProductType } from '@bigger/shared';
import { FilePlus2, LayoutTemplate } from 'lucide-react';
import { Link } from 'react-router';
import { pluralize } from '../../../lib/format';
import styles from '../CatalogAdmin.module.css';

export const NO_TYPE = 'ninguno';

function summarize(type: ProductType): string {
  const parts = [
    type.sizes.length > 0 ? pluralize(type.sizes.length, 'tamaño', 'tamaños') : null,
    type.modifierGroupIds.length > 0
      ? pluralize(type.modifierGroupIds.length, 'personalización', 'personalizaciones')
      : null,
    type.comboSlots.length > 0 ? pluralize(type.comboSlots.length, 'espacio', 'espacios') : null,
  ].filter(Boolean);
  return parts.length > 0 ? `Prellena ${parts.join(' · ')}` : 'Sin configuración previa';
}

/** First step of "nuevo": starting from a template avoids re-typing sizes and rules every time. */
export function TypePicker({ types }: { types: readonly ProductType[] }) {
  return (
    <section className={styles.section} aria-labelledby="tipo-titulo">
      <h2 id="tipo-titulo" className={styles.sectionTitle}>
        ¿Qué vas a agregar?
      </h2>
      <ul role="list" className={styles.typeGrid}>
        {types.map((type) => (
          <li key={type.id}>
            <Link to={`?tipo=${type.id}`} className={styles.typeCard}>
              <span className={styles.rowTitle}>
                <LayoutTemplate size={20} aria-hidden="true" />
                {type.name}
              </span>
              {type.description && <span className={styles.rowMeta}>{type.description}</span>}
              <span className={styles.rowMeta}>{summarize(type)}</span>
            </Link>
          </li>
        ))}
        <li>
          <Link to={`?tipo=${NO_TYPE}`} className={styles.typeCard}>
            <span className={styles.rowTitle}>
              <FilePlus2 size={20} aria-hidden="true" />
              Desde cero
            </span>
            <span className={styles.rowMeta}>Un formulario en blanco.</span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
