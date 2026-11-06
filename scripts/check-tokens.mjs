#!/usr/bin/env node
/**
 * Las pantallas no usan colores sueltos: todo sale de los tokens de `styles/tokens.css`.
 * Falla si encuentra un literal de color en componentes o features (fuera de pruebas).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../apps/web/src/', import.meta.url).pathname;
const SCANNED = ['components', 'features', 'pages', 'app'];
const EXTENSIONS = /\.(css|tsx?)$/;
const IGNORED = /\.test\.tsx?$/;
const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\(/;

function* files(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (EXTENSIONS.test(name) && !IGNORED.test(name)) yield path;
  }
}

const offenders = [];
for (const folder of SCANNED) {
  for (const path of files(join(ROOT, folder))) {
    readFileSync(path, 'utf8')
      .split('\n')
      .forEach((text, index) => {
        if (RAW_COLOR.test(text))
          offenders.push(`${relative(ROOT, path)}:${index + 1}  ${text.trim()}`);
      });
  }
}

if (offenders.length > 0) {
  process.stderr.write(
    `Colores sueltos en pantallas (usa un token de styles/tokens.css):\n${offenders.join('\n')}\n`,
  );
  process.exit(1);
}
process.stdout.write('check:tokens · sin colores sueltos\n');
