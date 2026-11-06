/** Lowercase, accent-free text, so "limon" finds "Limón" and "CAPUCHINO" finds "Capuchino". */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}
