import { z } from 'zod';

/**
 * Physical specification of a braille plate. The values follow the usual tactile standard
 * (dot base 1.5 mm, 2.5 mm between dots of a cell, 6.1 mm between cells, 10 mm between lines),
 * with a dot a little taller than printed braille because 3D printers round the tops off.
 */
export const BRAILLE_SPEC = {
  plateWidthMm: 150,
  plateHeightMm: 140,
  plateThicknessMm: 2.4,
  marginLeftMm: 12,
  marginRightMm: 12,
  dotDiameterMm: 1.5,
  dotHeightMm: 0.7,
  dotSpacingMm: 2.5,
  cellPitchMm: 6.1,
  linePitchMm: 10.2,
  /** Distance from the top edge to the first braille line (the category name in braille). */
  firstLineMm: 30,
  bottomMarginMm: 12,
  cornerCutMm: 14,
  qrMarkerSizeMm: 16,
} as const;

export function cellsPerLine(): number {
  const usable = BRAILLE_SPEC.plateWidthMm - BRAILLE_SPEC.marginLeftMm - BRAILLE_SPEC.marginRightMm;
  return Math.floor((usable - BRAILLE_SPEC.dotSpacingMm) / BRAILLE_SPEC.cellPitchMm) + 1;
}

export function linesPerPlate(): number {
  const usable =
    BRAILLE_SPEC.plateHeightMm - BRAILLE_SPEC.firstLineMm - BRAILLE_SPEC.bottomMarginMm;
  return Math.floor((usable - 2 * BRAILLE_SPEC.dotSpacingMm) / BRAILLE_SPEC.linePitchMm) + 1;
}

/** Each cell is a 6-bit mask: dot 1 = 1, dot 2 = 2, dot 3 = 4, dot 4 = 8, dot 5 = 16, dot 6 = 32. */
export const BrailleLineSchema = z.object({
  text: z.string(),
  cells: z.array(z.number().int().min(0).max(63)),
});
export type BrailleLine = z.infer<typeof BrailleLineSchema>;

export const BraillePlateSchema = z.object({
  id: z.string().min(1),
  categoryId: z.uuid(),
  categoryName: z.string(),
  part: z.number().int().min(1),
  parts: z.number().int().min(1),
  /** Raised block letters for the staff, e.g. "PASTELES". */
  titleText: z.string(),
  lines: z.array(BrailleLineSchema),
});
export type BraillePlate = z.infer<typeof BraillePlateSchema>;
