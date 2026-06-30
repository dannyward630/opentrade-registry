const trustedClientAddresses = new WeakMap<Request, string>();

export function setTrustedClientAddress(request: Request, address: string | undefined): void {
  const normalized = address?.trim();
  if (normalized) trustedClientAddresses.set(request, normalized);
}

export function getTrustedClientAddress(request: Request): string {
  return trustedClientAddresses.get(request) ?? "unknown";
}
