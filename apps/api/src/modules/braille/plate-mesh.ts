import { BRAILLE_SPEC as S, type BraillePlate } from '@bigger/shared';
import { textPixels } from './pixel-font.js';
import { Mesh } from './stl.js';

/** The plate is built with y pointing up the page, so y = plateHeight - (distance from the top). */
const fromTop = (mm: number) => S.plateHeightMm - mm;

const BLOCK_MM = 1.7;
const BLOCK_HEIGHT_MM = 1.2;

/** Dot positions inside a cell: columns 0/1 (dots 1-3 / 4-6), rows 0/1/2. */
function cellDots(mask: number): { column: number; row: number }[] {
  const dots: { column: number; row: number }[] = [];
  for (let dot = 0; dot < 6; dot += 1) {
    if (mask & (1 << dot)) dots.push({ column: Math.floor(dot / 3), row: dot % 3 });
  }
  return dots;
}

/** Base: a rectangle with the top-left corner cut off, so the plate is oriented by touch. */
function addBase(mesh: Mesh): void {
  const w = S.plateWidthMm,
    h = S.plateHeightMm,
    t = S.plateThicknessMm,
    c = S.cornerCutMm;
  const outline: [number, number][] = [
    [c, h],
    [w, h],
    [w, 0],
    [0, 0],
    [0, h - c],
  ];
  const bottomOf = (p: [number, number]) => [p[0], p[1], 0];
  const topOf = (p: [number, number]) => [p[0], p[1], t];
  const first = outline[0];
  if (!first) return;
  for (let i = 1; i < outline.length - 1; i += 1) {
    const a = outline[i],
      b = outline[i + 1];
    if (!a || !b) continue;
    mesh.triangle(topOf(first), topOf(a), topOf(b));
    mesh.triangle(bottomOf(first), bottomOf(b), bottomOf(a));
  }
  for (let i = 0; i < outline.length; i += 1) {
    const a = outline[i],
      b = outline[(i + 1) % outline.length];
    if (!a || !b) continue;
    mesh.quad(bottomOf(a), bottomOf(b), topOf(b), topOf(a));
  }
}

function addBlockText(mesh: Mesh, text: string): void {
  const { pixels, columns } = textPixels(text);
  const maxColumns = Math.floor(
    (S.plateWidthMm - S.marginLeftMm - S.qrMarkerSizeMm - 14) / BLOCK_MM,
  );
  const scale = columns > maxColumns ? maxColumns / columns : 1;
  const block = BLOCK_MM * scale;
  const x0 = S.marginLeftMm;
  const yTop = 11;
  for (const [column, row] of pixels) {
    const x = x0 + column * block;
    const y = fromTop(yTop + row * block);
    mesh.box(
      x,
      y - block * 0.92,
      S.plateThicknessMm - 0.1,
      x + block * 0.92,
      y,
      S.plateThicknessMm + BLOCK_HEIGHT_MM,
    );
  }
}

/** A raised frame where the QR code of the digital menu goes, found by touch. */
function addQrMarker(mesh: Mesh): void {
  const size = S.qrMarkerSizeMm,
    bar = 1.4;
  const x1 = S.plateWidthMm - S.marginRightMm,
    x0 = x1 - size;
  const yTop = 8,
    y1 = fromTop(yTop),
    y0 = y1 - size;
  const z0 = S.plateThicknessMm - 0.1,
    z1 = S.plateThicknessMm + 0.8;
  mesh.box(x0, y1 - bar, z0, x1, y1, z1);
  mesh.box(x0, y0, z0, x1, y0 + bar, z1);
  mesh.box(x0, y0 + bar, z0, x0 + bar, y1 - bar, z1);
  mesh.box(x1 - bar, y0 + bar, z0, x1, y1 - bar, z1);
}

export function plateToMesh(plate: BraillePlate): Mesh {
  const mesh = new Mesh();
  addBase(mesh);
  addBlockText(mesh, plate.titleText);
  addQrMarker(mesh);
  plate.lines.forEach((line, lineIndex) => {
    const top = S.firstLineMm + lineIndex * S.linePitchMm;
    line.cells.forEach((mask, cellIndex) => {
      const left = S.marginLeftMm + cellIndex * S.cellPitchMm;
      for (const { column, row } of cellDots(mask)) {
        mesh.dome(
          left + column * S.dotSpacingMm,
          fromTop(top + row * S.dotSpacingMm),
          S.plateThicknessMm,
          S.dotDiameterMm / 2,
          S.dotHeightMm,
        );
      }
    });
  });
  return mesh;
}
