import type { AdminModifierGroup, ModifierGroupInput } from '@bigger/shared';
import { AppError } from '../../core/errors/app-error.js';
import type { RealtimePublisher } from '../../realtime/event-hub.js';
import type { ModifierGroupsAdminRepository } from './modifier-groups.repository.js';
import { sameName } from './slugify.js';

export class ModifierGroupsAdminService {
  readonly #repository: ModifierGroupsAdminRepository;
  readonly #publisher: RealtimePublisher;

  constructor(repository: ModifierGroupsAdminRepository, publisher: RealtimePublisher) {
    this.#repository = repository;
    this.#publisher = publisher;
  }

  list(): Promise<AdminModifierGroup[]> {
    return this.#repository.list();
  }

  get(id: string): Promise<AdminModifierGroup> {
    return this.#get(id);
  }

  async create(input: ModifierGroupInput): Promise<AdminModifierGroup> {
    await this.#assertNameIsFree(input.name, null);
    const id = await this.#repository.create(input);
    return this.#changed(id);
  }

  async update(id: string, input: ModifierGroupInput): Promise<AdminModifierGroup> {
    await this.#get(id);
    await this.#assertNameIsFree(input.name, id);
    await this.#repository.update(id, input);
    return this.#changed(id);
  }

  /** Configuration only: past comandas will keep their own copy of the chosen options. */
  async delete(id: string): Promise<AdminModifierGroup> {
    const group = await this.#get(id);
    await this.#repository.delete(id);
    this.#publisher.publish({ type: 'catalog.updated' });
    return group;
  }

  async #get(id: string): Promise<AdminModifierGroup> {
    const group = await this.#repository.findById(id);
    if (!group) throw AppError.notFound('Personalización');
    return group;
  }

  async #assertNameIsFree(name: string, excludeId: string | null): Promise<void> {
    const groups = await this.#repository.list();
    if (groups.some((group) => group.id !== excludeId && sameName(group.name, name))) {
      throw new AppError('CONFLICT', `Ya existe la personalización «${name.trim()}»`);
    }
  }

  async #changed(id: string): Promise<AdminModifierGroup> {
    this.#publisher.publish({ type: 'catalog.updated' });
    return this.#get(id);
  }
}
