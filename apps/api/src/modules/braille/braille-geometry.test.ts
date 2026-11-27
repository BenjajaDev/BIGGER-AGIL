import { BRAILLE_SPEC as S, cellsPerLine, linesPerPlate } from '@bigger/shared';
import { describe, expect, it } from 'vitest';
import { Mesh } from './stl.js';

const spec = {
  radius: S.dotDiameterMm / 2,
  height: S.dotHeightMm,
  footHeight: S.dotFootHeightMm,
  flare: S.dotFootFlareMm,
  sink: S.dotSinkMm,
} as const;

function oneDot(): Mesh {
  const mesh = new Mesh();
  mesh.dot(10, 10, S.plateThicknessMm, spec);
  return mesh;
}

/** Reads the z coordinates back from the binary STL. */
function zRange(stl: Buffer): { min: number; max: number } {
  const count = stl.readUInt32LE(80);
  let min = Infinity;
  let max = -Infinity;
  for (let t = 0; t < count; t += 1) {
    for (let v = 0; v < 3; v += 1) {
      const z = stl.readFloatLE(84 + t * 50 + 12 + v * 12 + 8);
      min = Math.min(min, z);
      max = Math.max(max, z);
    }
  }
  return { min, max };
}

describe('braille plate geometry', () => {
  it('fits 18 cells per line and 9 lines per plate', () => {
    expect(cellsPerLine()).toBe(18);
    expect(linesPerPlate()).toBe(9);
  });

  it('keeps the title block and QR marker clear of the first braille line', () => {
    expect(S.firstLineMm).toBeGreaterThan(8 + S.qrMarkerSizeMm);
  });

  it('leaves enough gap between neighbouring dots', () => {
    expect(S.dotSpacingMm - S.dotDiameterMm).toBeGreaterThanOrEqual(0.9);
    expect(S.dotSpacingMm - (S.dotDiameterMm + 2 * S.dotFootFlareMm)).toBeGreaterThanOrEqual(0.6);
  });

  it('builds a dot that sinks into the plate and reaches the full height', () => {
    const stl = oneDot().toBinaryStl();
    const { min, max } = zRange(stl);
    expect(Math.abs(min - (S.plateThicknessMm - S.dotSinkMm))).toBeLessThan(1e-6);
    expect(Math.abs(max - (S.plateThicknessMm + S.dotHeightMm))).toBeLessThan(1e-6);
  });

  it('writes a consistent binary STL', () => {
    const mesh = oneDot();
    const stl = mesh.toBinaryStl();
    expect(mesh.triangleCount).toBeGreaterThan(0);
    expect(stl.readUInt32LE(80)).toBe(mesh.triangleCount);
    expect(stl.length).toBe(84 + 50 * mesh.triangleCount);
  });
});
