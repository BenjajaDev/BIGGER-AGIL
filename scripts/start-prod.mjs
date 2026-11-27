// Single-server mode: builds the web and the API, then runs the API serving the web too.
// Usage: pnpm start:prod [--skip-build]. Cross-platform on purpose (no `VAR=x cmd` syntax).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const webDist = resolve(root, 'apps/web/dist');
const apiDir = resolve(root, 'apps/api');

if (!process.argv.includes('--skip-build')) {
  const build = spawnSync('pnpm', ['build'], { cwd: root, stdio: 'inherit', shell: true });
  if (build.status !== 0) process.exit(build.status ?? 1);
}
if (!existsSync(resolve(webDist, 'index.html'))) {
  process.stderr.write('No encuentro apps/web/dist/index.html: ejecuta pnpm build primero.' + '\n');
  process.exit(1);
}

process.stdout.write(`Sirviendo la web desde ${webDist}\n`);
const server = spawn(process.execPath, ['dist/server.js'], {
  cwd: apiDir,
  stdio: 'inherit',
  env: { ...process.env, WEB_DIST_DIR: webDist },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 0));
