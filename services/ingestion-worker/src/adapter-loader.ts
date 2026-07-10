import type { TradeLicenseSourceAdapter } from "@opentrade-registry/core";

export type AdapterSpec = {
  packageName: string;
  exportName: string;
};

export type AdapterModuleLoader = (packageName: string) => Promise<Record<string, unknown>>;

export function parseAdapterSpecs(value: string | undefined): AdapterSpec[] {
  if (!value?.trim()) return [];
  return value.split(",").map((item) => {
    const [packageName, exportName, ...extra] = item.trim().split(":");
    if (!packageName || !exportName || extra.length > 0) {
      throw new Error(`Invalid adapter specification ${item}. Use @opentrade-registry/package:exportName.`);
    }
    if (!/^@opentrade-registry\/[a-z0-9-]+$/.test(packageName)) {
      throw new Error(`Adapter package ${packageName} is outside the OpenTrade Registry package scope.`);
    }
    if (!/^[A-Za-z_$][\w$]*$/.test(exportName)) {
      throw new Error(`Adapter export ${exportName} is invalid.`);
    }
    return { packageName, exportName };
  });
}

export async function loadConfiguredAdapters(
  specs: readonly AdapterSpec[],
  load: AdapterModuleLoader = (packageName) => import(packageName),
): Promise<ReadonlyMap<string, TradeLicenseSourceAdapter>> {
  const adapters = new Map<string, TradeLicenseSourceAdapter>();
  for (const spec of specs) {
    const module = await load(spec.packageName);
    const candidate = module[spec.exportName];
    if (!isAdapter(candidate)) throw new Error(`${spec.packageName}:${spec.exportName} is not a trade-license source adapter.`);
    if (adapters.has(candidate.sourceId)) throw new Error(`Multiple configured adapters use source ID ${candidate.sourceId}.`);
    adapters.set(candidate.sourceId, candidate);
  }
  return adapters;
}

function isAdapter(value: unknown): value is TradeLicenseSourceAdapter {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<TradeLicenseSourceAdapter>;
  return typeof candidate.sourceId === "string"
    && typeof candidate.getSourceMetadata === "function"
    && typeof candidate.checkAvailability === "function"
    && typeof candidate.streamRawRecords === "function"
    && typeof candidate.normalize === "function";
}
