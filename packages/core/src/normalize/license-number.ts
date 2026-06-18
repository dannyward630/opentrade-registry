export function normalizeLicenseNumber(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized.length > 0 ? normalized : null;
}

export function normalizeLicenseDigits(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  return digits.replace(/^0+/, "") || "0";
}

