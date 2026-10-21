import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

describe('parseEnv', () => {
  it('applies safe defaults', () => {
    expect(parseEnv({})).toEqual({
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: 3000,
      DATABASE_PATH: './data/bigger.db',
      CORS_ORIGINS: ['http://localhost:5173'],
      LOG_LEVEL: 'info',
    });
  });

  it('splits and validates CORS origins', () => {
    const env = parseEnv({ CORS_ORIGINS: 'http://localhost:5173, http://192.168.1.20:5173' });
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:5173', 'http://192.168.1.20:5173']);
  });

  it.each([
    [{ PORT: 'abc' }],
    [{ PORT: '70000' }],
    [{ CORS_ORIGINS: 'not-a-url' }],
    [{ NODE_ENV: 'staging' }],
  ])('rejects invalid values %o', (source) => {
    expect(() => parseEnv(source)).toThrow(/Variables de entorno inválidas/);
  });
});
