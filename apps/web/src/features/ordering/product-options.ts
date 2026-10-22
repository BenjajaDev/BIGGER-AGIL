import {
  resolveGroupRules,
  type EffectiveGroupRule,
  type MenuProduct,
  type ProductSize,
  type QuickNote,
} from '@bigger/shared';
import type { ComboChoice, LineConfig, SelectedOption } from './order-draft';

/** Chosen size, modifier option ids per group, and the product chosen per combo slot. */
export interface OptionSelection {
  sizeId: string | null;
  options: Record<string, string[]>;
  combo: Record<string, string>;
  quickNotes: QuickNote[];
  note: string;
}

export type SelectionRule = Pick<EffectiveGroupRule, 'group' | 'minSelections' | 'maxSelections'>;

/** A product opens the options modal only when it has something to choose. */
export function needsModal(product: MenuProduct): boolean {
  return (
    product.sizes.length > 0 || product.modifierGroups.length > 0 || product.comboSlots.length > 0
  );
}

export function selectedSize(product: MenuProduct, selection: OptionSelection): ProductSize | null {
  return product.sizes.find((size) => size.id === selection.sizeId) ?? null;
}

/** Customizations offered for the chosen size, with that size's min/max ("Grande: 1 proteína"). */
export function effectiveRules(
  product: MenuProduct,
  selection: OptionSelection,
): EffectiveGroupRule[] {
  return resolveGroupRules(product.modifierGroups, selectedSize(product, selection));
}

/** Keeps only what the rules allow: drops groups the size does not offer, trims to each maximum
 * and preselects the first option of a required single choice. */
function conformToRules(
  options: Record<string, string[]>,
  rules: readonly EffectiveGroupRule[],
): Record<string, string[]> {
  const next: Record<string, string[]> = {};
  for (const rule of rules) {
    const kept = (options[rule.group.id] ?? []).slice(0, rule.maxSelections);
    const first = rule.group.options.find((option) => option.isAvailable);
    next[rule.group.id] =
      kept.length === 0 && rule.minSelections >= 1 && rule.maxSelections === 1 && first
        ? [first.id]
        : kept;
  }
  return next;
}

/** First size, required single-choice groups and required combo slots start pre-filled. */
export function initialSelection(product: MenuProduct): OptionSelection {
  const base: OptionSelection = {
    sizeId: product.sizes[0]?.id ?? null,
    options: {},
    combo: {},
    quickNotes: [],
    note: '',
  };
  const combo: Record<string, string> = {};
  for (const slot of product.comboSlots) {
    const first = slot.options.find((option) => option.isAvailable);
    if (slot.isRequired && first) combo[slot.id] = first.productId;
  }
  return { ...base, combo, options: conformToRules({}, effectiveRules(product, base)) };
}

export function chooseSize(
  product: MenuProduct,
  selection: OptionSelection,
  sizeId: string,
): OptionSelection {
  const next = { ...selection, sizeId };
  return { ...next, options: conformToRules(selection.options, effectiveRules(product, next)) };
}

export function toggleOption(
  selection: OptionSelection,
  rule: SelectionRule,
  optionId: string,
): OptionSelection {
  const { group } = rule;
  const current = selection.options[group.id] ?? [];
  const has = current.includes(optionId);
  let next: string[];
  if (rule.maxSelections === 1) {
    next = has && rule.minSelections === 0 ? [] : [optionId];
  } else if (has) {
    next = current.filter((id) => id !== optionId);
  } else {
    next = current.length >= rule.maxSelections ? current : [...current, optionId];
  }
  return { ...selection, options: { ...selection.options, [group.id]: next } };
}

/** `null` leaves an optional slot empty ("sin donut"). */
export function chooseComboOption(
  selection: OptionSelection,
  slotId: string,
  productId: string | null,
): OptionSelection {
  const others = Object.entries(selection.combo).filter(([id]) => id !== slotId);
  const combo = Object.fromEntries(productId === null ? others : [...others, [slotId, productId]]);
  return { ...selection, combo };
}

export function selectionPriceClp(product: MenuProduct, selection: OptionSelection): number {
  let price = selectedSize(product, selection)?.priceClp ?? product.priceClp;
  for (const rule of effectiveRules(product, selection)) {
    for (const optionId of selection.options[rule.group.id] ?? []) {
      price += rule.group.options.find((option) => option.id === optionId)?.priceDeltaClp ?? 0;
    }
  }
  for (const slot of product.comboSlots) {
    const chosen = selection.combo[slot.id];
    price += slot.options.find((option) => option.productId === chosen)?.extraPriceClp ?? 0;
  }
  return price;
}

/** A size is chosen when needed, every rule is met and every required combo slot has a choice. */
export function isSelectionComplete(product: MenuProduct, selection: OptionSelection): boolean {
  if (product.sizes.length > 0 && selectedSize(product, selection) === null) return false;
  const rulesOk = effectiveRules(product, selection).every((rule) => {
    const chosen = (selection.options[rule.group.id] ?? []).length;
    return chosen >= rule.minSelections && chosen <= rule.maxSelections;
  });
  const combosOk = product.comboSlots.every(
    (slot) => !slot.isRequired || Boolean(selection.combo[slot.id]),
  );
  return rulesOk && combosOk;
}

export function toLineConfig(product: MenuProduct, selection: OptionSelection): LineConfig {
  const size = selectedSize(product, selection);
  const options: SelectedOption[] = [];
  for (const rule of effectiveRules(product, selection)) {
    for (const optionId of selection.options[rule.group.id] ?? []) {
      const option = rule.group.options.find((candidate) => candidate.id === optionId);
      if (option) {
        options.push({
          groupId: rule.group.id,
          groupName: rule.group.name,
          optionId: option.id,
          optionName: option.name,
          priceDeltaClp: option.priceDeltaClp,
        });
      }
    }
  }
  const comboChoices: ComboChoice[] = [];
  for (const slot of product.comboSlots) {
    const option = slot.options.find(
      (candidate) => candidate.productId === selection.combo[slot.id],
    );
    if (option) {
      comboChoices.push({
        slotId: slot.id,
        slotName: slot.name,
        productId: option.productId,
        productName: option.productName,
        extraPriceClp: option.extraPriceClp,
      });
    }
  }
  return {
    size: size ? { sizeId: size.id, sizeName: size.name, priceClp: size.priceClp } : null,
    options,
    comboChoices,
    quickNotes: selection.quickNotes,
    note: selection.note,
  };
}
