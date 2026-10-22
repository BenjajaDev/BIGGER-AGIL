import type { MenuProduct, ModifierGroup, QuickNote } from '@bigger/shared';
import type { ComboChoice, LineConfig, SelectedOption } from './order-draft';

/** Modifier option ids chosen per group, and the product chosen per combo slot. */
export interface OptionSelection {
  options: Record<string, string[]>;
  combo: Record<string, string>;
  quickNotes: QuickNote[];
  note: string;
}

/** A product opens the options modal only when it has something to choose. */
export function needsModal(product: MenuProduct): boolean {
  return product.modifierGroups.length > 0 || product.comboSlots.length > 0;
}

/** Required single-choice groups and combo slots start on their first available option. */
export function initialSelection(product: MenuProduct): OptionSelection {
  const options: Record<string, string[]> = {};
  for (const group of product.modifierGroups) {
    const first = group.options.find((option) => option.isAvailable);
    options[group.id] =
      group.minSelections >= 1 && group.maxSelections === 1 && first ? [first.id] : [];
  }
  const combo: Record<string, string> = {};
  for (const slot of product.comboSlots) {
    const first = slot.options.find((option) => option.isAvailable);
    if (first) combo[slot.id] = first.productId;
  }
  return { options, combo, quickNotes: [], note: '' };
}

export function toggleOption(
  selection: OptionSelection,
  group: ModifierGroup,
  optionId: string,
): OptionSelection {
  const current = selection.options[group.id] ?? [];
  const has = current.includes(optionId);
  let next: string[];
  if (group.maxSelections === 1) {
    next = has && group.minSelections === 0 ? [] : [optionId];
  } else if (has) {
    next = current.filter((id) => id !== optionId);
  } else {
    next = current.length >= group.maxSelections ? current : [...current, optionId];
  }
  return { ...selection, options: { ...selection.options, [group.id]: next } };
}

export function chooseComboOption(
  selection: OptionSelection,
  slotId: string,
  productId: string,
): OptionSelection {
  return { ...selection, combo: { ...selection.combo, [slotId]: productId } };
}

export function selectionPriceClp(product: MenuProduct, selection: OptionSelection): number {
  let price = product.priceClp;
  for (const group of product.modifierGroups) {
    for (const optionId of selection.options[group.id] ?? []) {
      price += group.options.find((option) => option.id === optionId)?.priceDeltaClp ?? 0;
    }
  }
  for (const slot of product.comboSlots) {
    const chosen = selection.combo[slot.id];
    price += slot.options.find((option) => option.productId === chosen)?.extraPriceClp ?? 0;
  }
  return price;
}

/** Every mandatory group meets its minimum and every combo slot has a choice. */
export function isSelectionComplete(product: MenuProduct, selection: OptionSelection): boolean {
  const groupsOk = product.modifierGroups.every(
    (group) => (selection.options[group.id] ?? []).length >= group.minSelections,
  );
  const combosOk = product.comboSlots.every((slot) => Boolean(selection.combo[slot.id]));
  return groupsOk && combosOk;
}

export function toLineConfig(product: MenuProduct, selection: OptionSelection): LineConfig {
  const options: SelectedOption[] = [];
  for (const group of product.modifierGroups) {
    for (const optionId of selection.options[group.id] ?? []) {
      const option = group.options.find((candidate) => candidate.id === optionId);
      if (option) {
        options.push({
          groupId: group.id,
          groupName: group.name,
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
  return { options, comboChoices, quickNotes: selection.quickNotes, note: selection.note };
}
