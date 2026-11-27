/** Pure parts of `setup.ts` (argv and the config file), kept apart so they can be unit tested. */

export interface SetupArgs {
  configPath: string;
  dataDir: string;
  webDir: string;
  pinFile: string | null;
  printerPath: string | null;
  seedCatalog: boolean;
}

export type ParsedSetupArgs = { ok: true; args: SetupArgs } | { ok: false; error: string };

export const SETUP_USAGE =
  'Uso: node setup.js --config <config.env> --data-dir <carpeta de datos> --web-dir <carpeta web> ' +
  '[--pin-file <archivo>] [--printer-path COM5] [--seed-catalog]';

const VALUE_OPTIONS = {
  '--config': 'configPath',
  '--data-dir': 'dataDir',
  '--web-dir': 'webDir',
  '--pin-file': 'pinFile',
  '--printer-path': 'printerPath',
} as const;

type ValueOption = keyof typeof VALUE_OPTIONS;

function isValueOption(name: string): name is ValueOption {
  return name in VALUE_OPTIONS;
}

/** Accepts `--name value` and `--name=value`. */
export function parseSetupArgs(argv: readonly string[]): ParsedSetupArgs {
  const values = new Map<string, string>();
  let seedCatalog = false;

  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index] ?? '';
    const equals = raw.indexOf('=');
    const name = raw.startsWith('--') && equals > 0 ? raw.slice(0, equals) : raw;

    if (name === '--seed-catalog') {
      seedCatalog = true;
    } else if (isValueOption(name)) {
      const value = equals > 0 && name !== raw ? raw.slice(equals + 1) : argv[(index += 1)];
      if (value === undefined || value === '' || value.startsWith('--')) {
        return { ok: false, error: `Falta el valor de ${name}` };
      }
      values.set(VALUE_OPTIONS[name], value);
    } else {
      return { ok: false, error: `Opción desconocida: ${raw}` };
    }
  }

  const configPath = values.get('configPath');
  const dataDir = values.get('dataDir');
  const webDir = values.get('webDir');
  const missing = [
    configPath === undefined && '--config',
    dataDir === undefined && '--data-dir',
    webDir === undefined && '--web-dir',
  ].filter((name): name is string => typeof name === 'string');
  if (configPath === undefined || dataDir === undefined || webDir === undefined) {
    return { ok: false, error: `Faltan opciones obligatorias: ${missing.join(', ')}` };
  }

  return {
    ok: true,
    args: {
      configPath,
      dataDir,
      webDir,
      pinFile: values.get('pinFile') ?? null,
      printerPath: values.get('printerPath') ?? null,
      seedCatalog,
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Config file (KEY=VALUE, the format `process.loadEnvFile` reads)
// ---------------------------------------------------------------------------------------------

export type ConfigValues = Record<string, string>;

interface ConfigEntry {
  key: string;
  comment: string;
}

const CONFIG_LAYOUT: readonly ConfigEntry[] = [
  { key: 'NODE_ENV', comment: 'Modo de ejecución. No lo cambies.' },
  {
    key: 'HOST',
    comment: '0.0.0.0 permite que las tablets y celulares del local entren por Wi-Fi.',
  },
  { key: 'PORT', comment: 'Puerto del sistema: se entra con http://IP-del-PC:PUERTO' },
  { key: 'DATABASE_PATH', comment: 'Base de datos (pedidos, carta, cuentas). Respáldala.' },
  { key: 'UPLOADS_DIR', comment: 'Fotos de productos y categorías.' },
  { key: 'BACKUP_DIR', comment: 'Respaldo diario de la base de datos.' },
  { key: 'BACKUP_KEEP', comment: 'Cuántos respaldos diarios se conservan.' },
  { key: 'WEB_DIST_DIR', comment: 'Pantallas del sistema (se actualiza al reinstalar).' },
  { key: 'BUSINESS_TIMEZONE', comment: 'Zona horaria del local.' },
  { key: 'ADMIN_PIN_HASH', comment: 'PIN del encargado, cifrado. Se cambia reinstalando.' },
  { key: 'ADMIN_SESSION_SECRET', comment: 'Secreto de las sesiones. No lo compartas.' },
  { key: 'PRINTER_ENABLED', comment: 'true imprime la comanda de cada pedido nuevo.' },
  { key: 'PRINTER_PATH', comment: 'Puerto de la impresora, por ejemplo COM5.' },
];

/** What a fresh install starts with; an existing file keeps its own values for these. */
export const CONFIG_DEFAULTS: ConfigValues = {
  NODE_ENV: 'production',
  HOST: '0.0.0.0',
  PORT: '3000',
  BACKUP_KEEP: '14',
  BUSINESS_TIMEZONE: 'America/Santiago',
  PRINTER_ENABLED: 'false',
  PRINTER_PATH: '',
};

const KNOWN_KEYS = new Set(CONFIG_LAYOUT.map((entry) => entry.key));

export function parseConfig(text: string): ConfigValues {
  const values: ConfigValues = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
    if (!match?.[1]) continue;
    let value = (match[2] ?? '').trim();
    const quote = value[0];
    if (value.length >= 2 && (quote === '"' || quote === "'" || quote === '`')) {
      const end = value.indexOf(quote, 1);
      if (end > 0) value = value.slice(1, end);
    } else {
      const comment = value.indexOf(' #');
      if (comment >= 0) value = value.slice(0, comment).trim();
    }
    values[match[1]] = value;
  }
  return values;
}

/** Windows paths keep their backslashes; only a `#` or edge spaces need quotes. */
function formatValue(value: string): string {
  if (!/[#'"`]|^\s|\s$/.test(value)) return value;
  if (!value.includes("'")) return `'${value}'`;
  if (!value.includes('"')) return `"${value}"`;
  throw new Error(`El valor «${value}» tiene comillas y # a la vez; no se puede guardar`);
}

export interface ConfigChanges {
  /** Always written: folders can change when the program is reinstalled elsewhere. */
  forced: ConfigValues;
}

/**
 * Builds the config file: defaults for what is missing, the existing values kept, `forced` on top.
 * Settings this script does not know (added by hand) are preserved at the end.
 */
export function mergeConfig(
  existing: ConfigValues | null,
  { forced }: ConfigChanges,
): ConfigValues {
  return { ...CONFIG_DEFAULTS, ...existing, ...forced };
}

/** Always LF, so the file looks the same wherever it is opened. */
export function renderConfig(values: ConfigValues): string {
  const lines = [
    '# Configuración de BIGGER Ágil.',
    '# Escrita por el instalador; puedes ajustar los valores y reiniciar el servicio.',
    '',
  ];
  for (const { key, comment } of CONFIG_LAYOUT) {
    const value = values[key];
    if (value === undefined) continue;
    lines.push(`# ${comment}`, `${key}=${formatValue(value)}`, '');
  }
  const extras = Object.entries(values).filter(([key]) => !KNOWN_KEYS.has(key));
  if (extras.length > 0) {
    lines.push('# Otros ajustes');
    for (const [key, value] of extras) lines.push(`${key}=${formatValue(value)}`);
    lines.push('');
  }
  return lines.join('\n');
}
