import type { Supply } from '@bigger/shared';
import { Minus, Plus } from 'lucide-react';
import { Field } from '../../../components/form/Field';
import { controlClassName } from '../../../components/form/control';
import { Button } from '../../../components/ui/Button';
import { cx } from '../../../lib/cx';
import { QUICK_AMOUNTS, type RegisterKind } from '../movement-math';
import { formatQuantity, formatSigned } from '../supply-text';
import styles from './Ficha.module.css';

const LABELS: Record<RegisterKind, string> = {
  purchase: 'Cantidad que llegó',
  waste: 'Cantidad perdida',
  adjustment: 'Cantidad contada',
};

export function QuantityControl({
  supply,
  kind,
  text,
  error,
  preview,
  onChange,
  onStep,
  onAdd,
}: {
  supply: Pick<Supply, 'unit'>;
  kind: RegisterKind;
  text: string;
  error: string | null;
  preview: string;
  onChange: (text: string) => void;
  onStep: (direction: 1 | -1) => void;
  onAdd: (amount: number) => void;
}) {
  const unit = formatQuantity(2, supply.unit).split(' ')[1] ?? '';
  const [previewLead, previewValue] = preview.split(': ');
  return (
    <div className={styles.form}>
      <Field label={LABELS[kind]} error={error ?? undefined}>
        {(control) => (
          <div className={styles.qtyRow}>
            <Button
              variant="secondary"
              iconOnly
              aria-label="Restar"
              onClick={() => {
                onStep(-1);
              }}
            >
              <Minus size={22} aria-hidden="true" />
            </Button>
            <span className={styles.qtyWrap}>
              <input
                {...control}
                className={cx(controlClassName, styles.qtyInput)}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={text}
                onChange={(event) => {
                  onChange(event.target.value);
                }}
              />
              <span className={styles.unit} aria-hidden="true">
                {unit}
              </span>
            </span>
            <Button
              variant="secondary"
              iconOnly
              aria-label="Sumar"
              onClick={() => {
                onStep(1);
              }}
            >
              <Plus size={22} aria-hidden="true" />
            </Button>
          </div>
        )}
      </Field>
      <div className={styles.quick} role="group" aria-label="Cantidades rápidas">
        {QUICK_AMOUNTS[supply.unit].map((amount) => (
          <Button
            key={amount}
            variant="secondary"
            onClick={() => {
              onAdd(amount);
            }}
          >
            {formatSigned(amount, supply.unit)}
          </Button>
        ))}
      </div>
      <p className={styles.preview} aria-live="polite">
        {previewValue === undefined ? (
          preview
        ) : (
          <>
            {previewLead}: <strong>{previewValue}</strong>
          </>
        )}
      </p>
    </div>
  );
}
