import { z } from 'zod';

/** What the administration needs to connect tablets and phones to this computer. */
export const SystemInfoSchema = z.object({
  /** Version of the installed system (e.g. `0.1.0`). */
  version: z.string().min(1),
  port: z.int().min(1).max(65_535),
  /** `http://<ipv4>:<port>` for every network the computer is on; private networks come first. */
  addresses: z.array(z.url()),
});
export type SystemInfo = z.infer<typeof SystemInfoSchema>;
