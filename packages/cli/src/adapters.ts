import { floridaDbprConstructionAdapter, FL_DBPR_CONSTRUCTION_SOURCE_ID } from "@opentrade/adapter-fl-dbpr";
import { oregonCcbActiveLicensesAdapter, OR_CCB_ACTIVE_LICENSES_SOURCE_ID } from "@opentrade/adapter-or-ccb";
import { texasTdlrAllLicensesAdapter, TX_TDLR_ALL_LICENSES_SOURCE_ID } from "@opentrade/adapter-tx-tdlr";
import { washingtonLniContractorsAdapter, WA_LNI_CONTRACTORS_SOURCE_ID } from "@opentrade/adapter-wa-lni";
import type { TradeLicenseSourceAdapter } from "@opentrade/core";

const adapters = new Map<string, TradeLicenseSourceAdapter>([
  [FL_DBPR_CONSTRUCTION_SOURCE_ID, floridaDbprConstructionAdapter],
  [OR_CCB_ACTIVE_LICENSES_SOURCE_ID, oregonCcbActiveLicensesAdapter],
  [TX_TDLR_ALL_LICENSES_SOURCE_ID, texasTdlrAllLicensesAdapter],
  [WA_LNI_CONTRACTORS_SOURCE_ID, washingtonLniContractorsAdapter],
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
