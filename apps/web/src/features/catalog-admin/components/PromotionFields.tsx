import { promotionStatus, type PromotionInput } from '@bigger/shared';
import { useFormContext, useWatch } from 'react-hook-form';
import { Checkbox } from '../../../components/form/Checkbox';
import { controlClassName } from '../../../components/form/control';
import { Field } from '../../../components/form/Field';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { localToday } from '../../../lib/dates';
import styles from '../CatalogAdmin.module.css';
import { PROMOTION_STATUS_BADGE } from '../promotion-status';

interface PromotionFormValues {
  promotion: PromotionInput | null;
}

const toDateOrNull = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null);

export function PromotionFields() {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<PromotionFormValues>();
  const promotion = useWatch({ control, name: 'promotion' });
  const status = promotionStatus(promotion, localToday());

  return (
    <div className={styles.rows}>
      <Checkbox
        label="Destacar en «Promociones»"
        description="Aparece primero en la carta, con la etiqueta Promoción. Sin fechas, queda activa hasta que la quites."
        checked={promotion !== null}
        onChange={(event) => {
          setValue('promotion', event.target.checked ? { startsOn: null, endsOn: null } : null, {
            shouldDirty: true,
          });
        }}
      />
      {promotion !== null && (
        <>
          <div className={styles.grid2}>
            <Field label="Desde (opcional)" error={errors.promotion?.startsOn?.message}>
              {(control) => (
                <input
                  {...control}
                  {...register('promotion.startsOn', { setValueAs: toDateOrNull })}
                  type="date"
                  className={controlClassName}
                />
              )}
            </Field>
            <Field label="Hasta (opcional)" error={errors.promotion?.endsOn?.message}>
              {(control) => (
                <input
                  {...control}
                  {...register('promotion.endsOn', { setValueAs: toDateOrNull })}
                  type="date"
                  className={controlClassName}
                />
              )}
            </Field>
          </div>
          {status !== 'none' && <StatusBadge {...PROMOTION_STATUS_BADGE[status]} />}
        </>
      )}
    </div>
  );
}
