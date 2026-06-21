import { floridaDbprConstructionAdapter, FL_DBPR_CONSTRUCTION_SOURCE_ID } from "@opentrade/adapter-fl-dbpr";
import { texasTdlrAllLicensesAdapter, TX_TDLR_ALL_LICENSES_SOURCE_ID } from "@opentrade/adapter-tx-tdlr";
import type { TradeLicenseSourceAdapter } from "@opentrade/core";

const adapters = new Map<string, TradeLicenseSourceAdapter>([
  [FL_DBPR_CONSTRUCTION_SOURCE_ID, floridaDbprConstructionAdapter],
  [TX_TDLR_ALL_LICENSES_SOURCE_ID, texasTdlrAllLicensesAdapter],
]);

export function getAdapter(sourceId: string): TradeLicenseSourceAdapter | null {
  return adapters.get(sourceId) ?? null;
}

export function requireAdapter(sourceId: string, operation: "sync" | "verify"): TradeLicenseSourceAdapter {
  const adapter = getAdapter(sourceId);
  if (adapter) {
    return adapter;
  }

  throw Object.assign(
    new Error(`Source ${sourceId} is registered for metadata, but no ${operation} adapter is implemented yet.`),
    { exitCode: 2 },
  );
}

export function listImplementedSourceIds(): string[] {
  return [...adapters.keys()].sort();
}
