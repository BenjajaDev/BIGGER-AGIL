import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, type ImageRefInput } from '@bigger/shared';
import { ImagePlus, LoaderCircle, Trash2 } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { FieldError } from '../../../components/form/Field';
import { Button } from '../../../components/ui/Button';
import { buttonClassName } from '../../../components/ui/button-styles';
import { CoverImage } from '../../../components/ui/CoverImage';
import { cx } from '../../../lib/cx';
import { useUploadImage } from '../useCatalogAdmin';
import styles from './ImageField.module.css';

export interface ImageFieldProps {
  legend: string;
  value: ImageRefInput | null;
  onChange: (value: ImageRefInput | null) => void;
  error?: string | undefined;
  ratio?: string;
}

const ACCEPT = ACCEPTED_IMAGE_TYPES.join(',');

function framingLabel(focusY: number): string {
  if (focusY <= 20) return 'arriba';
  if (focusY >= 80) return 'abajo';
  return 'centro';
}

/** Validated in the browser for quick feedback; the server re-checks the real content. */
function clientIssue(file: File): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'Usa una foto JPG, PNG o WebP';
  }
  if (file.size > MAX_IMAGE_BYTES) return 'La foto pesa más de 8 MB';
  return null;
}

/**
 * Photo upload with an instant local preview (the file is shown before the upload finishes) and a
 * vertical framing slider, so the manager sees exactly how the card will crop it.
 */
export function ImageField({ legend, value, onChange, error, ratio }: ImageFieldProps) {
  const upload = useUploadImage();
  const inputId = useId();
  const hintId = useId();
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    },
    [localPreview],
  );

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    const issue = clientIssue(file);
    if (issue) {
      setUploadError(issue);
      return;
    }
    setLocalPreview(URL.createObjectURL(file));
    try {
      const uploaded = await upload.mutateAsync(file);
      onChange({ imageId: uploaded.id, focusY: value?.focusY ?? 50 });
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : 'No pudimos subir la foto');
    } finally {
      setLocalPreview(null);
    }
  };

  const focusY = value?.focusY ?? 50;
  const message = uploadError ?? error;

  return (
    <fieldset className={styles.field}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.layout}>
        <div className={styles.preview}>
          <CoverImage
            image={value ? { id: value.imageId, focusY } : null}
            {...(localPreview ? { previewSrc: localPreview } : {})}
            {...(ratio ? { ratio } : {})}
            sizes="18rem"
          />
        </div>
        <div className={styles.controls}>
          <div className={styles.actions}>
            <label
              htmlFor={inputId}
              className={cx(buttonClassName({ variant: 'secondary' }), styles.upload)}
            >
              {upload.isPending ? (
                <LoaderCircle size={18} aria-hidden="true" />
              ) : (
                <ImagePlus size={18} aria-hidden="true" />
              )}
              {value ? 'Cambiar foto' : 'Subir foto'}
            </label>
            <input
              id={inputId}
              type="file"
              accept={ACCEPT}
              className={styles.fileInput}
              aria-describedby={hintId}
              disabled={upload.isPending}
              onChange={(event) => {
                void handleFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            {value && (
              <Button
                variant="ghost"
                onClick={() => {
                  onChange(null);
                }}
              >
                <Trash2 size={18} aria-hidden="true" />
                Quitar foto
              </Button>
            )}
          </div>
          <p id={hintId} className={styles.hint}>
            JPG, PNG o WebP de hasta 8 MB. Se optimiza sola y se le quitan los datos de ubicación.
          </p>
          <div role="status" className={styles.hint}>
            {upload.isPending ? 'Subiendo foto…' : ''}
          </div>
          {value && (
            <label className={styles.controls}>
              <span>Encuadre vertical</span>
              <input
                type="range"
                className={styles.range}
                min={0}
                max={100}
                step={5}
                value={focusY}
                aria-valuetext={`${framingLabel(focusY)}, ${focusY} %`}
                onChange={(event) => {
                  onChange({ imageId: value.imageId, focusY: Number(event.target.value) });
                }}
              />
            </label>
          )}
          {message && (
            <div role="alert">
              <FieldError message={message} />
            </div>
          )}
        </div>
      </div>
    </fieldset>
  );
}
