import { Field } from '../../../components/form/Field';
import { controlClassName } from '../../../components/form/control';
import { Chip } from '../../../components/ui/Chip';
import { WASTE_REASONS } from '../movement-math';
import styles from './Ficha.module.css';

export function ReasonPicker({
  reason,
  detail,
  onReason,
  onDetail,
}: {
  reason: string | null;
  detail: string;
  onReason: (reason: string | null) => void;
  onDetail: (detail: string) => void;
}) {
  return (
    <div>
      <p className={styles.fieldTitle} id="reason-title">
        Motivo (opcional)
      </p>
      <div className={styles.options} role="group" aria-labelledby="reason-title">
        {WASTE_REASONS.map((option) => (
          <Chip
            key={option}
            pressed={reason === option}
            onClick={() => {
              onReason(reason === option ? null : option);
            }}
          >
            {option}
          </Chip>
        ))}
      </div>
      {reason === 'Otro' && (
        <Field label="¿Qué pasó?" className={styles.expiryNote}>
          {(control) => (
            <input
              {...control}
              className={controlClassName}
              maxLength={100}
              value={detail}
              onChange={(event) => {
                onDetail(event.target.value);
              }}
            />
          )}
        </Field>
      )}
    </div>
  );
}
