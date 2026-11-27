import { Field } from '../../../components/form/Field';
import { controlClassName } from '../../../components/form/control';
import { Chip } from '../../../components/ui/Chip';
import type { ExpiryChoice } from '../useMovementForm';
import { formatExpiry } from '../supply-text';
import styles from './Ficha.module.css';

const CHOICES: readonly { value: ExpiryChoice; label: string }[] = [
  { value: 'none', label: 'Sin vencimiento' },
  { value: '3', label: '3 días' },
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
  { value: 'other', label: 'Otra fecha' },
];

export function ExpiryPicker({
  choice,
  date,
  resolved,
  error,
  onChoice,
  onDate,
}: {
  choice: ExpiryChoice;
  date: string;
  resolved: string | null;
  error: string | null;
  onChoice: (choice: ExpiryChoice) => void;
  onDate: (date: string) => void;
}) {
  return (
    <div>
      <p className={styles.fieldTitle} id="expiry-title">
        Vencimiento (opcional)
      </p>
      <div className={styles.options} role="group" aria-labelledby="expiry-title">
        {CHOICES.map(({ value, label }) => (
          <Chip
            key={value}
            pressed={choice === value}
            onClick={() => {
              onChoice(value);
            }}
          >
            {label}
          </Chip>
        ))}
      </div>
      {choice === 'other' && (
        <Field
          label="Fecha de vencimiento"
          error={error ?? undefined}
          className={styles.expiryNote}
        >
          {(control) => (
            <input
              {...control}
              type="date"
              className={controlClassName}
              value={date}
              onChange={(event) => {
                onDate(event.target.value);
              }}
            />
          )}
        </Field>
      )}
      {choice !== 'none' && resolved && (
        <p className={styles.expiryNote}>Vencerá el {formatExpiry(resolved)}.</p>
      )}
    </div>
  );
}
