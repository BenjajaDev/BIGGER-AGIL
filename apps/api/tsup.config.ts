import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { server: 'src/server.ts', setup: 'src/scripts/setup.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: ['@bigger/shared'],
});
