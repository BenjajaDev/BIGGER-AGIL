import type { AdminModifierGroup } from '@bigger/shared';
import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { controlClassName } from '../../../components/form/control';
import { FieldError } from '../../../components/form/Field';
import { cx } from '../../../lib/cx';
import { describeSelectionRule } from '../selection-rule';
import { withRule } from '../size-rules';
import styles from './SizeRulesMatrix.module.css';
import type { SizesFormValues } from './SizesEditor';

/** Every validation message nested anywhere inside a react-hook-form error tree. */
function collectMessages(error: unknown): string[] {
  if (typeof error !== 'object' || error === null) return [];
  const { message, ...nested } = error as { message?: unknown } & Record<string, unknown>;
  const own = typeof message === 'string' ? [message] : [];
  return [
    ...own,
    ...Object.entries(nested)
      .filter(([key]) => key !== 'ref' && key !== 'type')
      .flatMap(([, value]) => collectMessages(value)),
  ];
}

function parseCount(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export interface SizeRulesMatrixProps {
  groups: readonly AdminModifierGroup[];
}

/**
 * Per-size quantities ("Grande: 1 proteína + 4 vegetales", "Pequeña: 0 proteínas"). Empty cells use
 * the customization's own rule; a maximum of 0 means that size does not offer it.
 */
export function SizeRulesMatrix({ groups }: SizeRulesMatrixProps) {
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<SizesFormValues>();
  const sizes = useWatch({ control, name: 'sizes' });
  const groupIds = useWatch({ control, name: 'modifierGroupIds' });
  const selectedGroups = groups.filter((group) => groupIds.includes(group.id));

  // Unassigning a customization drops its per-size rules so the form stays valid.
  useEffect(() => {
    sizes.forEach((size, index) => {
      const kept = size.groupRules.filter((rule) => groupIds.includes(rule.groupId));
      if (kept.length !== size.groupRules.length) {
        setValue(`sizes.${index}.groupRules`, kept, { shouldDirty: true });
      }
    });
  }, [groupIds, sizes, setValue]);

  if (sizes.length === 0 || selectedGroups.length === 0) return null;

  const ruleErrors = [
    ...new Set(sizes.flatMap((_, index) => collectMessages(errors.sizes?.[index]?.groupRules))),
  ];

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <caption className="visually-hidden">
          Cantidad a elegir de cada personalización según el tamaño
        </caption>
        <thead>
          <tr>
            <th scope="col">Tamaño</th>
            {selectedGroups.map((group) => (
              <th key={group.id} scope="col">
                {group.name}
                <br />
                <span className={styles.offered}>
                  General:{' '}
                  {describeSelectionRule(group.minSelections, group.maxSelections).toLowerCase()}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sizes.map((size, sizeIndex) => {
            const sizeName = size.name || `Tamaño ${sizeIndex + 1}`;
            return (
              <tr key={sizeIndex}>
                <th scope="row">{sizeName}</th>
                {selectedGroups.map((group) => {
                  const rule = size.groupRules.find((candidate) => candidate.groupId === group.id);
                  const update = (change: Parameters<typeof withRule>[2]) => {
                    setValue(
                      `sizes.${sizeIndex}.groupRules`,
                      withRule(size.groupRules, group, change),
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      },
                    );
                  };
                  return (
                    <td key={group.id}>
                      <div className={styles.cell}>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={10}
                          className={cx(controlClassName, styles.number)}
                          aria-label={`Mínimo de ${group.name} en ${sizeName}`}
                          placeholder={String(group.minSelections)}
                          value={rule?.minSelections ?? ''}
                          onChange={(event) => {
                            update({ minSelections: parseCount(event.target.value) });
                          }}
                        />
                        <span aria-hidden="true">a</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={10}
                          className={cx(controlClassName, styles.number)}
                          aria-label={`Máximo de ${group.name} en ${sizeName}`}
                          placeholder={String(group.maxSelections)}
                          value={rule?.maxSelections ?? ''}
                          onChange={(event) => {
                            update({ maxSelections: parseCount(event.target.value) });
                          }}
                        />
                      </div>
                      {rule?.maxSelections === 0 && (
                        <span className={styles.offered}>No se ofrece</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {ruleErrors.map((message) => (
        <FieldError key={message} message={message} />
      ))}
    </div>
  );
}
