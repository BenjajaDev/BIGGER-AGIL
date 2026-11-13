import type { ImageAsset } from '@bigger/shared';
import type { CSSProperties } from 'react';
import { cx } from '../../lib/cx';
import { focusPosition, imageSrcSet, imageUrl } from '../../lib/media';
import styles from './CoverImage.module.css';
import { coverMotif } from './cover-motif';

export interface CoverImageProps {
  image: Pick<ImageAsset, 'id' | 'focusY'> | null;
  /** Rendered width hint for the browser to pick the right file, e.g. "(min-width: 64rem) 25vw, 100vw". */
  sizes?: string;
  /** CSS aspect ratio, e.g. "16 / 9" or "1". */
  ratio?: string;
  /** Overrides the image URL (local preview before the upload finishes). */
  previewSrc?: string;
  className?: string;
  priority?: boolean;
  /** Product or category name: picks the illustration shown while there is no photo. */
  motif?: string;
}

/**
 * Decorative card picture: the card's heading already names the product, so the image is hidden
 * from assistive technology (`alt=""`) instead of repeating it.
 */
export function CoverImage({
  image,
  sizes = '(min-width: 64rem) 25vw, (min-width: 40rem) 50vw, 100vw',
  ratio,
  previewSrc,
  className,
  priority = false,
  motif,
}: CoverImageProps) {
  const style = ratio ? ({ '--cover-ratio': ratio } as CSSProperties) : undefined;
  const position = image ? focusPosition(image) : '50% 50%';

  return (
    <div className={cx(styles.frame, className)} style={style}>
      {previewSrc ? (
        <img
          className={styles.image}
          src={previewSrc}
          alt=""
          style={{ objectPosition: position }}
        />
      ) : image ? (
        <img
          className={styles.image}
          src={imageUrl(image.id, 'card')}
          srcSet={imageSrcSet(image.id)}
          sizes={sizes}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          style={{ objectPosition: position }}
        />
      ) : (
        <Placeholder label={motif} />
      )}
    </div>
  );
}

function Placeholder({ label }: { label: string | undefined }) {
  const { icon: Icon, tone } = coverMotif(label);
  return (
    <div className={cx(styles.placeholder, styles[tone])} aria-hidden="true">
      <span className={styles.badge}>
        <Icon className={styles.icon} strokeWidth={1.5} />
      </span>
    </div>
  );
}
