const nonSearchCharacters = /[^\p{L}\p{N}]+/gu;
const diacritics = /\p{Diacritic}/gu;

export function normalizeSearchText(value: unknown): string {
  return String(value ?? '')
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(diacritics, '')
    .toLocaleLowerCase('vi')
    .replace(nonSearchCharacters, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function matchesSearch(query: string, values: readonly unknown[]): boolean {
  const terms = normalizeSearchText(query).split(' ').filter(Boolean);
  if (!terms.length) return true;
  const words = normalizeSearchText(values.filter(value => value !== null && value !== undefined).join(' ')).split(' ').filter(Boolean);
  return terms.every(term => words.some(word => word.startsWith(term)));
}
