/** A triangle soup: 9 numbers per triangle (three vertices, x y z in millimetres). */
export class Mesh {
  readonly #data: number[] = [];

  get triangleCount(): number {
    return this.#data.length / 9;
  }

  triangle(a: readonly number[], b: readonly number[], c: readonly number[]): void {
    this.#data.push(...a, ...b, ...c);
  }

  quad(
    a: readonly number[],
    b: readonly number[],
    c: readonly number[],
    d: readonly number[],
  ): void {
    this.triangle(a, b, c);
    this.triangle(a, c, d);
  }

  /** Axis-aligned box, outward facing. */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): void {
    const p = (x: number, y: number, z: number) => [x, y, z];
    this.quad(p(x0, y0, z0), p(x0, y1, z0), p(x1, y1, z0), p(x1, y0, z0));
    this.quad(p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1));
    this.quad(p(x0, y0, z0), p(x1, y0, z0), p(x1, y0, z1), p(x0, y0, z1));
    this.quad(p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1), p(x1, y0, z1));
    this.quad(p(x1, y1, z0), p(x0, y1, z0), p(x0, y1, z1), p(x1, y1, z1));
    this.quad(p(x0, y1, z0), p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1));
  }

  /** Domed dot (spherical cap) standing on `z`, sunk slightly into the plate so it fuses with it. */
  dome(cx: number, cy: number, z: number, baseRadius: number, height: number, segments = 14): void {
    const sink = 0.15;
    const sphereRadius = (baseRadius ** 2 + height ** 2) / (2 * height);
    const centreZ = z + height - sphereRadius;
    const rings = [0, 0.5, 0.82, 1].map((t) => {
      // angle from the vertical axis: 0 at the apex, up to the base angle
      const baseAngle = Math.asin(Math.min(baseRadius / sphereRadius, 1));
      const angle = baseAngle * (1 - t);
      return { r: sphereRadius * Math.sin(angle), z: centreZ + sphereRadius * Math.cos(angle) };
    });
    const apex = [cx, cy, z + height];
    const point = (ring: { r: number; z: number }, k: number) => {
      const a = (2 * Math.PI * k) / segments;
      return [cx + ring.r * Math.cos(a), cy + ring.r * Math.sin(a), ring.z];
    };
    const bottom = { r: baseRadius, z: z - sink };
    const ringList = [rings[1], rings[2], rings[3], bottom].filter(
      (ring): ring is { r: number; z: number } => ring !== undefined,
    );
    const first = ringList[0];
    if (!first) return;
    for (let k = 0; k < segments; k += 1) this.triangle(apex, point(first, k), point(first, k + 1));
    for (let i = 0; i < ringList.length - 1; i += 1) {
      const upper = ringList[i];
      const lower = ringList[i + 1];
      if (!upper || !lower) continue;
      for (let k = 0; k < segments; k += 1) {
        this.quad(point(upper, k), point(lower, k), point(lower, k + 1), point(upper, k + 1));
      }
    }
    const centre = [cx, cy, z - sink];
    for (let k = 0; k < segments; k += 1)
      this.triangle(centre, point(bottom, k + 1), point(bottom, k));
  }

  toBinaryStl(name = 'BIGGER braille'): Buffer {
    const count = this.triangleCount;
    const buffer = Buffer.alloc(84 + count * 50);
    buffer.write(name.slice(0, 79), 0, 'ascii');
    buffer.writeUInt32LE(count, 80);
    for (let t = 0; t < count; t += 1) {
      const o = t * 9;
      const d = this.#data;
      const v = (i: number) => d[o + i] ?? 0;
      const ux = v(3) - v(0),
        uy = v(4) - v(1),
        uz = v(5) - v(2);
      const wx = v(6) - v(0),
        wy = v(7) - v(1),
        wz = v(8) - v(2);
      let nx = uy * wz - uz * wy,
        ny = uz * wx - ux * wz,
        nz = ux * wy - uy * wx;
      const length = Math.hypot(nx, ny, nz) || 1;
      nx /= length;
      ny /= length;
      nz /= length;
      let at = 84 + t * 50;
      for (const value of [nx, ny, nz, ...d.slice(o, o + 9)]) {
        buffer.writeFloatLE(value, at);
        at += 4;
      }
      buffer.writeUInt16LE(0, at);
    }
    return buffer;
  }
}
