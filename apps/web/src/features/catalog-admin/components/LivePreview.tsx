import type { ComboProductInput, ProductKind, SingleProductInput } from '@bigger/shared';
import { useFormContext, useWatch } from 'react-hook-form';
import { MenuCard } from '../../menu/components/MenuCard';
import styles from '../CatalogAdmin.module.css';
import { previewCombo, previewSingleProduct, type PreviewSources } from '../card-preview';

export interface LivePreviewProps extends PreviewSources {
  kind: ProductKind;
}

/** The exact card customers will see, rebuilt from the form on every change. */
export function LivePreview({ kind, ...sources }: LivePreviewProps) {
  const { control } = useFormContext<SingleProductInput | ComboProductInput>();
  const values = useWatch({ control });
  const product =
    kind === 'single'
      ? previewSingleProduct(values as Partial<SingleProductInput>, sources)
      : previewCombo(values as Partial<ComboProductInput>, sources);

  return (
    <aside className={styles.preview} aria-labelledby="vista-previa-titulo">
      <h2 id="vista-previa-titulo" className={styles.previewTitle}>
        Así se verá en la carta
      </h2>
      <MenuCard product={product} />
    </aside>
  );
}
