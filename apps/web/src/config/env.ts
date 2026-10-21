import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const WebEnvSchema = z.object({
  VITE_API_BASE_URL: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^(https?:\/\/|\/)/, 'Debe ser una URL absoluta o una ruta que empiece con /')
      .default('/api/v1'),
  ),
  VITE_WHATSAPP_NUMBER: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^\d{8,15}$/, 'Usa formato internacional sin "+" ni espacios')
      .optional(),
  ),
});

export type WebEnv = z.infer<typeof WebEnvSchema>;

export function parseWebEnv(source: Record<string, unknown>): WebEnv {
  const result = WebEnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Configuración inválida del frontend:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const webEnv = parseWebEnv(import.meta.env);
