import { parseWebEnv } from './env';

describe('parseWebEnv', () => {
  it('defaults the API base URL and treats empty values as missing', () => {
    expect(parseWebEnv({ VITE_WHATSAPP_NUMBER: '' })).toEqual({ VITE_API_BASE_URL: '/api/v1' });
  });

  it('accepts a valid WhatsApp number', () => {
    expect(parseWebEnv({ VITE_WHATSAPP_NUMBER: '56912345678' }).VITE_WHATSAPP_NUMBER).toBe(
      '56912345678',
    );
  });

  it.each([[{ VITE_WHATSAPP_NUMBER: '+56 9 1234 5678' }], [{ VITE_API_BASE_URL: 'api/v1' }]])(
    'rejects invalid configuration %o',
    (source) => {
      expect(() => parseWebEnv(source)).toThrow(/Configuración inválida del frontend/);
    },
  );
});
