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
  const normalizedValues = values
    .filter(value => value !== null && value !== undefined)
    .map(value => normalizeSearchText(value));
  const words = normalizedValues.flatMap(value => value.split(' ')).filter(Boolean);
  return terms.every(term => words.some(word => word.startsWith(term)));
}

export function matchesPhone(query: string, phones: readonly unknown[]): boolean {
  const compact = String(query ?? '').trim().replace(/[+()\s.-]/g, '');
  if (!/^\d{3,}$/.test(compact)) return false;
  const digits = compact;
  return phones.some(phone => String(phone ?? '').replace(/\D/g, '').includes(digits));
}

export type PermitSuggestion = {
  permitNumber: string;
  projectName: string;
  investorName: string;
  investorPhone?: string;
  address: string;
  communeCode: string;
  communeName?: string;
};

export function suggestPermits<T extends PermitSuggestion>(query: string, permits: readonly T[], limit = 6): T[] {
  const normalized = normalizeSearchText(query);
  if (normalized.length < 2 || limit <= 0) return [];
  const fields = (permit: T) => [permit.permitNumber, permit.projectName, permit.investorName, permit.address, permit.communeCode, permit.communeName]
    .map(value => normalizeSearchText(value));
  return permits.map((permit, index) => {
    const values = fields(permit);
    const matched = matchesSearch(query, [
      permit.permitNumber,
      permit.projectName,
      permit.investorName,
      permit.address,
      permit.communeCode,
      permit.communeName,
    ]) || matchesPhone(query, [permit.investorPhone]);
    const score = values.includes(normalized) ? 0
      : values.some(value => value.startsWith(normalized)) ? 1
      : values.some(value => value.includes(normalized)) ? 2
      : matchesPhone(query, [permit.investorPhone]) ? 3
      : 4;
    return { permit, index, matched, score };
  }).filter(item => item.matched).sort((a, b) => a.score - b.score || a.index - b.index).slice(0, limit).map(item => item.permit);
}

export type CommuneRank = { code: string; name: string; count: number };

export function rankCommunes<T extends { communeCode: string }>(
  records: readonly T[],
  places: readonly { code: string; name: string }[],
): CommuneRank[] {
  const counts = new Map<string, number>();
  for (const record of records) counts.set(record.communeCode, (counts.get(record.communeCode) ?? 0) + 1);
  return places
    .map(place => ({ ...place, count: counts.get(place.code) ?? 0 }))
    .filter(place => place.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'));
}
