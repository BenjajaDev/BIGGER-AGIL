import { SupplyInputSchema, type Supply, type SupplyUnit } from '@bigger/shared';
import { useState, type SyntheticEvent } from 'react';
import { parseQuantity, quantityText } from './movement-math';
import { useRegisterMovement, useSaveSupply } from './useInventory';

/** Form state, validation and the two-step save (supply, then its optional first count). */
export function useSupplyForm(supply: Supply | null, onDone: () => void) {
  const save = useSaveSupply();
  const register = useRegisterMovement();
  const [name, setName] = useState(supply?.name ?? '');
  const [unit, setUnit] = useState<SupplyUnit>(supply?.unit ?? 'kg');
  const [minStock, setMinStock] = useState(supply ? quantityText(supply.minStock) : '');
  const [cost, setCost] = useState(supply ? String(supply.costPerUnitClp) : '');
  const [supplierId, setSupplierId] = useState(supply?.supplierId ?? '');
  const [expiresOn, setExpiresOn] = useState(supply?.expiresOn ?? '');
  const [initialStock, setInitialStock] = useState('');
  const [shown, setShown] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const min = minStock.trim() === '' ? 0 : parseQuantity(minStock);
  const stock = initialStock.trim() === '' ? null : parseQuantity(initialStock);
  const errors = {
    name: name.trim() === '' ? 'Escribe el nombre' : undefined,
    min: min === null ? 'Escribe un número, por ejemplo 2,5' : undefined,
    stock:
      initialStock.trim() !== '' && stock === null
        ? 'Escribe un número, por ejemplo 10'
        : undefined,
  };
  const invalid = Object.values(errors).some(Boolean);
  const pending = save.isPending || register.isPending;

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    setShown(true);
    const parsed = SupplyInputSchema.safeParse({
      name,
      unit,
      minStock: min,
      costPerUnitClp: Math.round(Number(cost || 0)),
      supplierId: supplierId === '' ? null : supplierId,
      expiresOn: expiresOn === '' ? null : expiresOn,
    });
    if (invalid || !parsed.success) {
      if (!invalid && !parsed.success)
        setFailure(parsed.error.issues[0]?.message ?? 'Revisa los datos');
      return;
    }
    setFailure(null);
    save.mutateAsync({ id: supply?.id ?? null, input: parsed.data }).then(
      async (saved) => {
        if (!supply && stock !== null && stock > 0) {
          await register.mutateAsync({
            id: saved.id,
            input: { kind: 'adjustment', quantity: stock, expiresOn: null, note: 'Stock inicial' },
          });
        }
        onDone();
      },
      () => undefined,
    );
  };

  return {
    name,
    setName,
    unit,
    setUnit,
    minStock,
    setMinStock,
    cost,
    setCost,
    supplierId,
    setSupplierId,
    expiresOn,
    setExpiresOn,
    initialStock,
    setInitialStock,
    shown,
    errors,
    pending,
    submit,
    failure: failure ?? save.error?.message ?? register.error?.message ?? null,
  };
}
