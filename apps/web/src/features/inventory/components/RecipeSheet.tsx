import type { Recipe, Supply } from '@bigger/shared';
import { Plus, Trash2, X } from 'lucide-react';
import { useId, useState, type SyntheticEvent } from 'react';
import { controlClassName } from '../../../components/form/control';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Sheet, SheetFooter } from '../../../components/ui/Sheet';
import { parseQuantity, quantityText } from '../movement-math';
import { formatQuantity } from '../supply-text';
import { useSetRecipe } from '../useInventory';
import styles from './Lists.module.css';
import { UnitInput } from './UnitInput';

interface Line {
  supplyId: string;
  quantity: string;
}

export interface RecipeTarget {
  productId: string;
  productName: string;
}

function RecipeBody({
  target,
  recipe,
  supplies,
  onDone,
}: {
  target: RecipeTarget;
  recipe: Recipe | null;
  supplies: readonly Supply[];
  onDone: () => void;
}) {
  const formId = useId();
  const save = useSetRecipe();
  const [lines, setLines] = useState<Line[]>(
    (recipe?.lines ?? []).map((line) => ({
      supplyId: line.supplyId,
      quantity: quantityText(line.quantity),
    })),
  );
  const [confirming, setConfirming] = useState(false);
  const [shown, setShown] = useState(false);
  const update = (index: number, patch: Partial<Line>) => {
    setLines(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };
  const invalid = lines.some(
    (line) => line.supplyId === '' || (parseQuantity(line.quantity) ?? 0) <= 0,
  );

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    setShown(true);
    if (invalid) return;
    save.mutate(
      {
        productId: target.productId,
        input: {
          lines: lines.map((line) => ({
            supplyId: line.supplyId,
            quantity: parseQuantity(line.quantity) ?? 0,
          })),
        },
      },
      { onSuccess: onDone },
    );
  };

  return (
    <>
      <p className={styles.hint}>
        Qué insumos usa una unidad de este producto: al venderlo, el stock baja solo.
      </p>
      <form id={formId} className={styles.form} onSubmit={submit} noValidate>
        {lines.map((line, index) => {
          const supply = supplies.find((candidate) => candidate.id === line.supplyId);
          const bad = shown && (line.supplyId === '' || (parseQuantity(line.quantity) ?? 0) <= 0);
          return (
            <div key={`${String(index)}-${line.supplyId}`} className={styles.lineRow}>
              <select
                className={controlClassName}
                aria-label={`Insumo ${String(index + 1)}`}
                aria-invalid={bad && line.supplyId === '' ? true : undefined}
                value={line.supplyId}
                onChange={(event) => {
                  update(index, { supplyId: event.target.value });
                }}
              >
                <option value="">Elige un insumo</option>
                {supplies.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </select>
              <UnitInput
                aria-label={`Cantidad ${String(index + 1)}`}
                aria-invalid={bad && line.supplyId !== '' ? true : undefined}
                unit={supply ? (formatQuantity(2, supply.unit).split(' ')[1] ?? '') : ''}
                value={line.quantity}
                onChange={(event) => {
                  update(index, { quantity: event.target.value });
                }}
              />
              <Button
                variant="ghost"
                iconOnly
                aria-label={`Quitar insumo ${String(index + 1)}`}
                onClick={() => {
                  setLines(lines.filter((_, i) => i !== index));
                }}
              >
                <X size={20} aria-hidden="true" />
              </Button>
            </div>
          );
        })}
        {shown && invalid && (
          <p role="alert" className={styles.error}>
            Cada línea necesita un insumo y una cantidad mayor que cero.
          </p>
        )}
        {save.error && (
          <p role="alert" className={styles.error}>
            {save.error.message}
          </p>
        )}
        <Button
          variant="secondary"
          onClick={() => {
            setLines([...lines, { supplyId: '', quantity: '1' }]);
          }}
        >
          <Plus size={18} aria-hidden="true" />
          Agregar insumo
        </Button>
      </form>
      {recipe && (
        <Button
          variant="danger"
          onClick={() => {
            setConfirming(true);
          }}
        >
          <Trash2 size={18} aria-hidden="true" />
          Quitar receta
        </Button>
      )}
      <SheetFooter>
        <Button
          type="submit"
          form={formId}
          variant="primary"
          size="lg"
          fullWidth
          disabled={save.isPending}
        >
          {save.isPending ? 'Guardando…' : 'Guardar receta'}
        </Button>
      </SheetFooter>
      <ConfirmDialog
        open={confirming}
        title={`¿Quitar la receta de ${target.productName}?`}
        description="Al vender este producto el stock ya no bajará solo."
        confirmLabel="Quitar receta"
        isPending={save.isPending}
        error={save.error?.message ?? null}
        onClose={() => {
          setConfirming(false);
        }}
        onConfirm={() => {
          save.mutate({ productId: target.productId, input: { lines: [] } }, { onSuccess: onDone });
        }}
      />
    </>
  );
}

export function RecipeSheet({
  target,
  recipe,
  supplies,
  onClose,
}: {
  target: RecipeTarget | null;
  recipe: Recipe | null;
  supplies: readonly Supply[];
  onClose: () => void;
}) {
  return (
    <Sheet
      open={target !== null}
      onClose={onClose}
      title={target ? `Receta: ${target.productName}` : 'Receta'}
      size="lg"
    >
      {target && (
        <RecipeBody
          key={target.productId}
          target={target}
          recipe={recipe}
          supplies={supplies}
          onDone={onClose}
        />
      )}
    </Sheet>
  );
}
