import type { TableQr } from '@bigger/shared';
import { randomBytes } from 'node:crypto';
import { AppError } from '../../core/errors/app-error.js';
import type { TableQrRepository } from './table-qr.repository.js';

/** 18 random bytes = 144 bits: not guessable, and short enough for a small QR. */
const newToken = () => randomBytes(18).toString('base64url');

export class TableQrService {
  readonly #repository: TableQrRepository;

  constructor(repository: TableQrRepository) {
    this.#repository = repository;
  }

  /** Every active table with its token; tables that never had one get theirs here. */
  async list(): Promise<TableQr[]> {
    const rows = await this.#repository.listActive();
    const result: TableQr[] = [];
    for (const row of rows) {
      let token = row.token;
      if (token === null) {
        token = newToken();
        await this.#repository.setToken(row.id, token);
      }
      result.push({ id: row.id, number: row.number, label: row.label, token });
    }
    return result;
  }

  /** A new token makes the QR printed before stop working (a leaked or old card). */
  async regenerate(id: string): Promise<void> {
    if (!(await this.#repository.setToken(id, newToken()))) throw AppError.notFound('Mesa');
  }

  async labelFor(token: string): Promise<string> {
    const label = await this.#repository.labelForToken(token);
    if (label === null) throw AppError.notFound('Mesa');
    return label;
  }
}
