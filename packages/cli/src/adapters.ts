import { arizonaRocContractorsAdapter, AZ_ROC_CONTRACTORS_SOURCE_ID } from "@opentrade-registry/adapter-az-roc";
import { californiaCslbContractorsAdapter, CA_CSLB_CONTRACTORS_SOURCE_ID } from "@opentrade-registry/adapter-ca-cslb";
import { floridaDbprConstructionAdapter, FL_DBPR_CONSTRUCTION_SOURCE_ID } from "@opentrade-registry/adapter-fl-dbpr";
import { minnesotaDliLicensesRegistrationsAdapter, MN_DLI_LICENSES_REGISTRATIONS_SOURCE_ID } from "@opentrade-registry/adapter-mn-dli";
import { oregonCcbActiveLicensesAdapter, OR_CCB_ACTIVE_LICENSES_SOURCE_ID } from "@opentrade-registry/adapter-or-ccb";
import { texasTdlrAllLicensesAdapter, TX_TDLR_ALL_LICENSES_SOURCE_ID } from "@opentrade-registry/adapter-tx-tdlr";
import { washingtonLniContractorsAdapter, WA_LNI_CONTRACTORS_SOURCE_ID } from "@opentrade-registry/adapter-wa-lni";
import type { TradeLicenseSourceAdapter } from "@opentrade-registry/core";

const adapters = new Map<string, TradeLicenseSourceAdapter>([
  [AZ_ROC_CONTRACTORS_SOURCE_ID, arizonaRocContractorsAdapter],
  [CA_CSLB_CONTRACTORS_SOURCE_ID, californiaCslbContractorsAdapter],
  [FL_DBPR_CONSTRUCTION_SOURCE_ID, floridaDbprConstructionAdapter],
  [MN_DLI_LICENSES_REGISTRATIONS_SOURCE_ID, minnesotaDliLicensesRegistrationsAdapter],
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
    new Error(`Source ${sourceId} is registered for metadata, but no ${operation} adapter is implemented yet. Run opentrade sources show ${sourceId} for maturity, coverage, and caveats.`),
    { exitCode: 2 },
  );
}

export function listImplementedSourceIds(): string[] {
  return [...adapters.keys()].sort();
}
