import type { AdminModifierGroup, SizeInput } from '@bigger/shared';

export type SizeGroupRule = SizeInput['groupRules'][number];

/** Upserts a size's override for one group; clearing both numbers falls back to the group rule. */
export function withRule(
  rules: readonly SizeGroupRule[],
  group: Pick<AdminModifierGroup, 'id' | 'minSelections' | 'maxSelections'>,
  change: { minSelections?: number | null; maxSelections?: number | null },
): SizeGroupRule[] {
  const current = rules.find((rule) => rule.groupId === group.id);
  const minSelections =
    change.minSelections !== undefined ? change.minSelections : (current?.minSelections ?? null);
  const maxSelections =
    change.maxSelections !== undefined ? change.maxSelections : (current?.maxSelections ?? null);
  const others = rules.filter((rule) => rule.groupId !== group.id);
  if (minSelections === null && maxSelections === null) return others;
  return [
    ...others,
    {
      groupId: group.id,
      minSelections: minSelections ?? Math.min(group.minSelections, maxSelections ?? Infinity),
      maxSelections: maxSelections ?? Math.max(group.maxSelections, minSelections ?? 0),
    },
  ];
}
