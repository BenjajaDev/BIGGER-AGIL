import type { BraillePlate, Menu } from '@bigger/shared';
import { AppError } from '../../core/errors/app-error.js';
import { buildBraillePlates } from './braille-plates.js';
import { plateToMesh } from './plate-mesh.js';

export interface MenuSource {
  getPublicMenu: () => Promise<Menu>;
}

/** Turns the public menu into braille plates and into the 3D files to print them. */
export class BrailleService {
  readonly #menu: MenuSource;

  constructor(menu: MenuSource) {
    this.#menu = menu;
  }

  async plates(): Promise<BraillePlate[]> {
    const menu = await this.#menu.getPublicMenu();
    return buildBraillePlates(menu.categories);
  }

  async stl(plateId: string): Promise<{ filename: string; data: Buffer }> {
    const plate = (await this.plates()).find((candidate) => candidate.id === plateId);
    if (!plate) throw AppError.notFound('Placa braille');
    return { filename: `carta-braille-${plate.id}.stl`, data: plateToMesh(plate).toBinaryStl() };
  }
}
