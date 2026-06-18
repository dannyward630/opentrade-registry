export function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeUpperAlnum(value: string | null | undefined): string | null {
  const normalized = normalizeText(value)?.toUpperCase().replace(/[^A-Z0-9]/g, "") ?? null;
  return normalized && normalized.length > 0 ? normalized : null;
}

