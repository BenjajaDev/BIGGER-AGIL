import {
  MAX_SPLIT_PARTS,
  PAYMENT_METHODS,
  PAYMENT_MODES,
  type Check,
  type PaymentMethod,
  type PaymentMode,
} from '@bigger/shared';
import { Minus, Plus } from 'lucide-react';
import { useId } from 'react';
import { Checkbox } from '../../../components/form/Checkbox';
import { MoneyInput } from '../../../components/form/MoneyInput';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { formatClp, formatClpSpoken } from '../../../lib/format';
import { cashShortcuts, selectWholeOrder, tipAllowed } from '../payment-draft';
import {
  orderLabel,
  PAYMENT_METHOD_PRESENTATION,
  PAYMENT_MODE_LABEL,
} from '../payment-presentation';
import styles from './PaymentDialog.module.css';

const toAmount = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : Math.max(parsed, 0);
};

export function ModePicker({
  value,
  onChange,
}: {
  value: PaymentMode;
  onChange: (mode: PaymentMode) => void;
}) {
  const name = useId();
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>¿Qué se paga?</legend>
      <div className={styles.segmented}>
        {PAYMENT_MODES.map((mode) => (
          <label key={mode} className={styles.segment}>
            <input
              type="radio"
              name={name}
              checked={value === mode}
              onChange={() => {
                onChange(mode);
              }}
            />
            {PAYMENT_MODE_LABEL[mode]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export interface ItemPickerProps {
  check: Pick<Check, 'orders' | 'lines'>;
  units: Readonly<Record<string, number>>;
  onChange: (units: Record<string, number>) => void;
}

/** Each person's lines with what is still unpaid; one tap selects everything of an order. */
export function ItemPicker({ check, units, onChange }: ItemPickerProps) {
  const billable = check.orders.filter((order) => order.status !== 'cancelled');
  return (
    <div className={styles.group}>
      {billable.map((order, index) => {
        const lines = check.lines.filter(
          (line) => line.orderId === order.id && line.paidQuantity < line.quantity,
        );
        if (lines.length === 0) return null;
        const label = orderLabel(order, index);
        return (
          <section key={order.id} className={styles.person} aria-label={label}>
            <div className={styles.personHead}>
              <span className={styles.personName}>{label}</span>
              <Button
                variant="ghost"

                onClick={() => {
                  onChange(selectWholeOrder(check, units, order.id));
                }}
              >
                Todo lo de {label}
              </Button>
            </div>
            <ul role="list" className={styles.lines}>
              {lines.map((line) => {
                const pending = line.quantity - line.paidQuantity;
                const chosen = units[line.orderItemId] ?? 0;
                const set = (quantity: number) => {
                  onChange({ ...units, [line.orderItemId]: quantity });
                };
                return (
                  <li key={line.orderItemId} className={styles.line}>
                    <span className={styles.lineName}>
                      {line.productName}
                      <span className={styles.muted}>
                        {' '}
                        · {formatClp(line.unitTotalClp)} c/u
                        {line.paidQuantity > 0 && ` · ${line.paidQuantity} ya pagado`}
                      </span>
                    </span>
                    <div
                      className={styles.stepper}
                      role="group"
                      aria-label={`Unidades de ${line.productName} a pagar`}
                    >
                      <button
                        type="button"
                        className={styles.step}
                        disabled={chosen === 0}
                        aria-label={`Quitar un ${line.productName}`}
                        onClick={() => {
                          set(chosen - 1);
                        }}
                      >
                        <Minus size={18} aria-hidden="true" />
                      </button>
                      <output className={styles.stepValue} aria-live="polite">
                        {chosen} de {pending}
                      </output>
                      <button
                        type="button"
                        className={styles.step}
                        disabled={chosen >= pending}
                        aria-label={`Agregar un ${line.productName}`}
                        onClick={() => {
                          set(chosen + 1);
                        }}
                      >
                        <Plus size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

const QUICK_PARTS = [2, 3, 4, 5, 6];

export interface SplitPickerProps {
  check: Pick<Check, 'splitParts' | 'remainingParts' | 'nextPartClp'>;
  isPending: boolean;
  onSplit: (parts: number | null) => void;
}

export function SplitPicker({ check, isPending, onSplit }: SplitPickerProps) {
  const { splitParts, remainingParts, nextPartClp } = check;
  if (splitParts !== null && remainingParts !== null && nextPartClp !== null) {
    const current = Math.min(splitParts - remainingParts + 1, splitParts);
    return (
      <div className={styles.splitSummary}>
        <p>
          <span className={styles.splitPart}>
            Parte {current} de {splitParts}
          </span>{' '}
          <span className={styles.splitAmount}>{formatClp(nextPartClp)}</span>
        </p>
        <Button
          variant="ghost"

          disabled={isPending}
          onClick={() => {
            onSplit(null);
          }}
        >
          Cambiar división
        </Button>
      </div>
    );
  }
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>¿En cuántas partes?</legend>
      <div className={styles.chips}>
        {QUICK_PARTS.filter((parts) => parts <= MAX_SPLIT_PARTS).map((parts) => (
          <Chip
            key={parts}
            pressed={false}
            disabled={isPending}
            onClick={() => {
              onSplit(parts);
            }}
          >
            {parts} personas
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

export function MethodPicker({
  value,
  onChange,
}: {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
}) {
  const name = useId();
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>Medio de pago</legend>
      <div className={styles.methods}>
        {PAYMENT_METHODS.map((method) => {
          const { label, icon: Icon } = PAYMENT_METHOD_PRESENTATION[method];
          return (
            <label key={method} className={styles.method}>
              <input
                type="radio"
                name={name}
                checked={value === method}
                onChange={() => {
                  onChange(method);
                }}
              />
              <Icon size={28} aria-hidden="true" />
              {label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export interface TipFieldProps {
  method: PaymentMethod | null;
  enabled: boolean;
  tipClp: number;
  onToggle: (enabled: boolean) => void;
  onChange: (tipClp: number | null) => void;
}

export function TipField({ method, enabled, tipClp, onToggle, onChange }: TipFieldProps) {
  const inputId = useId();
  if (!tipAllowed(method)) {
    return (
      <p className={styles.note}>
        JUNAEB no admite propina. Si quieren dejarla, regístrala como otro pago en efectivo o
        débito.
      </p>
    );
  }
  return (
    <div className={styles.tip}>
      <Checkbox
        label="Agregar propina"
        description="Sugerida: 10 % de lo que se paga. Puedes cambiar el monto."
        checked={enabled}
        onChange={(event) => {
          onToggle(event.target.checked);
        }}
      />
      {enabled && (
        <div className={styles.field}>
          <label htmlFor={inputId} className={styles.legend}>
            Propina
          </label>
          <MoneyInput
            id={inputId}
            value={tipClp}
            onChange={(event) => {
              onChange(toAmount(event.target.value));
            }}
          />
        </div>
      )}
    </div>
  );
}

export interface CashFieldProps {
  dueClp: number;
  receivedClp: number | null;
  changeClp: number | null;
  onChange: (receivedClp: number | null) => void;
}

export function CashField({ dueClp, receivedClp, changeClp, onChange }: CashFieldProps) {
  const inputId = useId();
  return (
    <div className={styles.group}>
      <div className={styles.field}>
        <label htmlFor={inputId} className={styles.legend}>
          Recibido en efectivo
        </label>
        <MoneyInput
          id={inputId}
          value={receivedClp ?? ''}
          onChange={(event) => {
            onChange(toAmount(event.target.value));
          }}
        />
      </div>
      <div className={styles.chips} aria-label="Montos rápidos">
        {cashShortcuts(dueClp).map((amount, index) => (
          <Chip
            key={amount}
            pressed={receivedClp === amount}
            onClick={() => {
              onChange(amount);
            }}
            aria-label={
              index === 0 ? `Exacto, ${formatClpSpoken(amount)}` : formatClpSpoken(amount)
            }
          >
            {index === 0 ? 'Exacto' : formatClp(amount)}
          </Chip>
        ))}
      </div>
      {/* The change is shown in the footer; this only announces it. */}
      <p className="visually-hidden" aria-live="polite">
        {changeClp === null ? '' : `Vuelto: ${formatClpSpoken(changeClp)}`}
      </p>
    </div>
  );
}
