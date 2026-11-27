import type { Supply } from '@bigger/shared';
import { useState } from 'react';
import { localToday } from '../../lib/dates';
import {
  addDaysIso,
  nextStock,
  parseQuantity,
  quantityError,
  quantityText,
  STEP,
  submitLabel,
  type RegisterKind,
} from './movement-math';
import { formatQuantity } from './supply-text';
import { useRegisterMovement } from './useInventory';

export type ExpiryChoice = 'none' | '3' | '7' | '30' | 'other';

export interface MovementInitial {
  kind?: RegisterKind;
  quantity?: number;
}

export interface SavedMovement {
  supply: Supply;
  kind: RegisterKind;
  quantity: number;
  previousStock: number;
}

/** State and rules of the «Llegó / Se perdió / Contar» form of one supply. */
export function useMovementForm(
  supply: Supply,
  initial: MovementInitial,
  onSaved: (saved: SavedMovement) => void,
) {
  const register = useRegisterMovement();
  const [kind, setKind] = useState<RegisterKind>(initial.kind ?? 'purchase');
  const [texts, setTexts] = useState<Record<RegisterKind, string>>({
    purchase: initial.quantity === undefined ? '' : quantityText(initial.quantity),
    waste: '',
    adjustment: quantityText(supply.stock),
  });
  const [expiry, setExpiry] = useState<ExpiryChoice>('none');
  const [customDate, setCustomDate] = useState('');
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [shown, setShown] = useState(false);

  const text = texts[kind];
  const quantity = parseQuantity(text);
  const setText = (value: string) => {
    setTexts({ ...texts, [kind]: value });
  };
  const add = (amount: number) => {
    const next = Math.max((quantity ?? 0) + amount, 0);
    setText(quantityText(next));
  };
  const today = localToday();
  const expiresOn =
    kind !== 'purchase' || expiry === 'none'
      ? null
      : expiry === 'other'
        ? customDate || null
        : addDaysIso(today, Number(expiry));
  const expiryError =
    kind === 'purchase' && expiry === 'other'
      ? customDate === ''
        ? 'Elige la fecha de vencimiento'
        : customDate < today
          ? 'La fecha ya pasó'
          : null
      : null;
  const error = quantityError(kind, supply, text);
  const note =
    kind !== 'waste' || reason === null
      ? ''
      : reason === 'Otro' && detail.trim() !== ''
        ? `Otro: ${detail.trim()}`
        : reason;

  return {
    kind,
    setKind,
    text,
    setText,
    quantity,
    add,
    step: (direction: 1 | -1) => {
      add(direction * STEP[supply.unit]);
    },
    expiry,
    setExpiry,
    customDate,
    setCustomDate,
    expiresOn,
    reason,
    setReason,
    detail,
    setDetail,
    error: shown ? error : null,
    expiryError: shown ? expiryError : null,
    showErrors: () => {
      setShown(true);
    },
    preview:
      quantity === null
        ? `Ahora hay ${formatQuantity(supply.stock, supply.unit)}`
        : `${kind === 'adjustment' ? 'Quedará exactamente' : 'Quedará'}: ${formatQuantity(nextStock(kind, supply.stock, quantity), supply.unit)}`,
    label: submitLabel(kind, supply, error === null ? quantity : null),
    pending: register.isPending,
    serverError: register.error?.message ?? null,
    submit: () => {
      setShown(true);
      if (error !== null || expiryError !== null || quantity === null) return;
      register.mutate(
        { id: supply.id, input: { kind, quantity, expiresOn, note } },
        {
          onSuccess: () => {
            onSaved({ supply, kind, quantity, previousStock: supply.stock });
          },
        },
      );
    },
  };
}
