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

  /**
   * Braille dot as a closed solid of revolution with outward winding. From bottom to top: a disc
   * at `z - sink` and a cylinder up to `z` (both with radius `baseRadius + flare`, the embedded
   * part that fuses with the plate), a conical flare shrinking to `baseRadius` at `z + flare`
   * height, a vertical foot up to `z + footHeight`, and a spherical cap up to the apex at
   * `z + height`.
   */
  dot(
    cx: number,
    cy: number,
    z: number,
    spec: {
      radius: number;
      height: number;
      footHeight: number;
      flare: number;
      sink: number;
      flareHeight?: number;
    },
    segments = 24,
    capRings = 6,
  ): void {
    const { radius, height, footHeight, flare, sink } = spec;
    const flareHeight = spec.flareHeight ?? 0.15;
    const capHeight = height - footHeight;
    const sphereRadius = (radius ** 2 + capHeight ** 2) / (2 * capHeight);
    const centreZ = z + height - sphereRadius;
    const baseAngle = Math.asin(Math.min(radius / sphereRadius, 1));
    type Ring = { r: number; z: number };
    // Profile from the bottom (outer radius) up to just below the apex.
    const profile: Ring[] = [
      { r: radius + flare, z: z - sink },
      { r: radius + flare, z },
      { r: radius, z: z + flareHeight },
      { r: radius, z: z + footHeight },
    ];
    for (let i = 1; i < capRings; i += 1) {
      const angle = baseAngle * (1 - i / capRings);
      profile.push({
        r: sphereRadius * Math.sin(angle),
        z: centreZ + sphereRadius * Math.cos(angle),
      });
    }
    const point = (ring: Ring, k: number) => {
      const a = (2 * Math.PI * k) / segments;
      return [cx + ring.r * Math.cos(a), cy + ring.r * Math.sin(a), ring.z];
    };
    const bottom = profile[0];
    const last = profile[profile.length - 1];
    if (!bottom || !last) return;
    const centre = [cx, cy, z - sink];
    const apex = [cx, cy, z + height];
    for (let k = 0; k < segments; k += 1) {
      this.triangle(centre, point(bottom, k + 1), point(bottom, k));
      this.triangle(apex, point(last, k), point(last, k + 1));
    }
    for (let i = 0; i < profile.length - 1; i += 1) {
      const lower = profile[i];
      const upper = profile[i + 1];
      if (!lower || !upper) continue;
      for (let k = 0; k < segments; k += 1) {
        this.quad(point(lower, k), point(lower, k + 1), point(upper, k + 1), point(upper, k));
      }
    }
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
