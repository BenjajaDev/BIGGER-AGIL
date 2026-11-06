import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const tokensCss = readFileSync(join(import.meta.dirname, 'tokens.css'), 'utf8');

function readTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const [, name, value] of css.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    if (name !== undefined && value !== undefined) tokens.set(name, value.trim());
  }
  return tokens;
}

const tokens = readTokens(tokensCss);

function resolve(name: string): string {
  const value = tokens.get(name);
  if (value === undefined) throw new Error(`Token inexistente: ${name}`);
  const reference = /^var\((--[\w-]+)\)$/.exec(value);
  return reference?.[1] ? resolve(reference[1]) : value;
}

function luminance(hex: string): number {
  const [red = 0, green = 0, blue = 0] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: string, background: string): number {
  const [lighter = 0, darker = 0] = [
    luminance(resolve(foreground)),
    luminance(resolve(background)),
  ].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const TEXT_PAIRS: readonly [string, string][] = [
  ['--text-primary', '--surface-page'],
  ['--text-primary', '--surface-card'],
  ['--text-primary', '--surface-muted'],
  ['--text-secondary', '--surface-page'],
  ['--text-secondary', '--surface-card'],
  ['--text-secondary', '--surface-muted'],
  ['--text-inverse', '--surface-inverse'],
  ['--text-inverse', '--surface-kitchen'],
  ['--text-inverse', '--action-primary'],
  ['--text-inverse', '--status-success'],
  ['--text-on-warm', '--status-highlight'],
  ['--text-on-warm', '--status-warning'],
  ['--accent', '--surface-card'],
  ['--status-error', '--surface-card'],
  ['--tone-success-ink', '--tone-success-soft'],
  ['--tone-warning-ink', '--tone-warning-soft'],
  ['--tone-danger-ink', '--tone-danger-soft'],
  ['--tone-accent-ink', '--tone-accent-soft'],
  ['--tone-neutral-ink', '--tone-neutral-soft'],
  ['--status-highlight', '--surface-inverse'],
];

describe('contraste de los tokens', () => {
  it.each(TEXT_PAIRS)('%s sobre %s llega a 4,5:1', (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it('el anillo de foco se distingue sobre cada fondo (3:1)', () => {
    expect(contrast('--focus-ring', '--surface-page')).toBeGreaterThanOrEqual(3);
    expect(contrast('--focus-ring-inverse', '--surface-inverse')).toBeGreaterThanOrEqual(3);
  });

  it('mantiene los tamaños táctiles mínimos', () => {
    expect(parseInt(resolve('--touch-target'))).toBeGreaterThanOrEqual(48);
    expect(parseInt(resolve('--touch-large'))).toBeGreaterThanOrEqual(64);
  });
});
