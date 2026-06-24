import { describe, expect, it } from "vitest";
import healthHandler, { getHealthStatus } from "../api/health.js";
import readinessHandler from "../api/readiness.js";
import {
  loadSourceReadinessForApi,
  loadSourcesForApi,
  loadSourcesFromDatabase,
  type RegistryDatabaseClient,
} from "../api/registry.js";
import sourcesHandler from "../api/sources.js";

describe("hosted API", () => {
  it("reports healthy when database environment variables are not configured", async () => {
    const originalUrl = process.env.OPENTRADE_SUPABASE_URL;
    const originalAnonKey = process.env.OPENTRADE_SUPABASE_ANON_KEY;
    delete process.env.OPENTRADE_SUPABASE_URL;
    delete process.env.OPENTRADE_SUPABASE_ANON_KEY;

    const response = createMockResponse();
    await healthHandler({} as never, response as never);

    restoreEnv("OPENTRADE_SUPABASE_URL", originalUrl);
    restoreEnv("OPENTRADE_SUPABASE_ANON_KEY", originalAnonKey);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      service: "opentrade-registry",
      fileRegistrySourceCount: 56,
      database: {
        configured: false,
        status: "not_configured"
      }
    });
  });

  it("returns source registry entries from local metadata", async () => {
    const response = createMockResponse();
    await sourcesHandler({ query: {} } as never, response as never);

    expect(response.statusCode).toBe(200);
    expect(response.body.origin).toBe("registry_files");
    expect(response.body.count).toBe(56);
    expect(response.body.sources.some((source: { id: string }) => source.id === "us.fl.dbpr.construction")).toBe(true);
  });

  it("returns source readiness from local metadata", async () => {
    const response = createMockResponse();
    await readinessHandler({ query: {} } as never, response as never);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      origin: "registry_files",
      sourceCount: 56,
      registryOnlySourceCount: 52,
      note: expect.stringContaining("planning signal only"),
    });
    expect(response.body.implementedAdapterSources.map((source: { id: string }) => source.id)).toEqual([
      "us.fl.dbpr.construction",
      "us.or.ccb.active_licenses",
      "us.tx.tdlr.all_licenses",
      "us.wa.lni.contractors",
    ]);
    expect(response.body.unimplementedBulkAdapterCandidates.map((source: { id: string }) => source.id)).toEqual([
      "us.ak.commerce.construction_contractors",
      "us.ca.cslb.contractors",
      "us.il.idfpr.roofing_contractors",
      "us.in.pla.professional_licenses",
      "us.mn.dli.licenses_registrations",
    ]);
  });

  it("returns a single source registry entry by id", async () => {
    const response = createMockResponse();
    await sourcesHandler({ query: { id: "us.oh.commerce.ocilb_contractors" } } as never, response as never);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      id: "us.oh.commerce.ocilb_contractors",
      adapterMaturity: "registry_only",
      origin: "registry_files"
    });
  });

  it("loads source registry entries from database rows when a database client is available", async () => {
    const result = await loadSourcesForApi({
      databaseClient: createFakeDatabaseClient({
        rows: [createSourceRow("us.ct.dcp.home_improvement_contractors", "CT")],
      }),
    });

    expect(result.origin).toBe("database");
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toMatchObject({
      id: "us.ct.dcp.home_improvement_contractors",
      jurisdiction: {
        state: "CT"
      },
      adapterMaturity: "registry_only"
    });
  });

  it("returns source readiness from database rows when a database client is available", async () => {
    const result = await loadSourceReadinessForApi({
      databaseClient: createFakeDatabaseClient({
        rows: [
          {
            ...createSourceRow("us.fl.dbpr.construction", "FL"),
            source_type: "bulk_csv",
            adapter_status: "implemented",
            adapter_maturity: "local_file_adapter",
            coverage_scope: "state_agency_partial",
          },
          {
            ...createSourceRow("us.ca.cslb.contractors", "CA"),
            source_type: "bulk_xlsx",
            metadata: {
              ...createSourceRow("us.ca.cslb.contractors", "CA").metadata,
              hasBulkDownload: true,
            },
          },
        ],
      }),
    });

    expect(result.origin).toBe("database");
    expect(result.sourceCount).toBe(2);
    expect(result.implementedAdapterSources.map((source) => source.id)).toEqual(["us.fl.dbpr.construction"]);
    expect(result.unimplementedBulkAdapterCandidates.map((source) => source.id)).toEqual(["us.ca.cslb.contractors"]);
    expect(result.registryOnlySourceCount).toBe(1);
  });

  it("fills legacy partial database metadata from registry files before validation", async () => {
    const result = await loadSourcesForApi({
      databaseClient: createFakeDatabaseClient({
        rows: [
          {
            ...createSourceRow("us.fl.dbpr.construction", "FL"),
            metadata: {
              adapterPackage: "@opentrade/adapter-fl-dbpr",
              officialLookupUrl: "https://www.myfloridalicense.com/wl11.asp",
              publicRecordsNotes: "Legacy partial metadata row.",
            },
            last_verified_at: "2026-06-19 00:00:00+00",
          },
        ],
      }),
    });

    expect(result.origin).toBe("database");
    expect(result.sources[0]).toMatchObject({
      id: "us.fl.dbpr.construction",
      hasBulkDownload: true,
      hasLiveLookup: true,
      lastVerifiedAt: "2026-06-19T00:00:00.000Z",
    });
  });

  it("falls back to registry files when database source loading fails", async () => {
    const result = await loadSourcesForApi({
      databaseClient: createFakeDatabaseClient({
        error: "database unavailable",
      }),
    });

    expect(result.origin).toBe("registry_files");
    expect(result.databaseError).toBe("database unavailable");
    expect(result.sources).toHaveLength(56);
  });

  it("returns file-backed readiness when database source loading fails", async () => {
    const result = await loadSourceReadinessForApi({
      databaseClient: createFakeDatabaseClient({
        error: "database unavailable",
      }),
    });

    expect(result.origin).toBe("registry_files");
    expect(result.databaseError).toBe("database unavailable");
    expect(result.sourceCount).toBe(56);
    expect(result.unimplementedBulkAdapterCandidates).toHaveLength(5);
  });

  it("reports matching database and file source counts when database count succeeds", async () => {
    const health = await getHealthStatus({
      databaseClient: createFakeDatabaseClient({
        count: 56,
      }),
    });

    expect(health.statusCode).toBe(200);
    expect(health.body).toMatchObject({
      ok: true,
      fileRegistrySourceCount: 56,
      database: {
        configured: true,
        status: "available",
        registrySourceCount: 56,
        sourceCountMatchesFiles: true
      }
    });
  });

  it("maps database rows through the public source schema", async () => {
    const sources = await loadSourcesFromDatabase(
      createFakeDatabaseClient({
        rows: [createSourceRow("us.wv.labor.contractors", "WV")],
      }),
    );

    expect(sources[0]?.sourceType).toBe("html_lookup");
    expect(sources[0]?.sourceDiscoveryStatus).toBe("researched");
  });
});

function createMockResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    }
  };
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

function createFakeDatabaseClient(options: { rows?: unknown[]; count?: number; error?: string }): RegistryDatabaseClient {
  return {
    from() {
      return {
        select(_columns: string, selectOptions?: { count?: "exact"; head?: boolean }) {
          if (selectOptions?.head) {
            return Promise.resolve({
              count: options.count ?? options.rows?.length ?? 0,
              error: options.error ? { message: options.error } : null,
            });
          }

          return {
            order() {
              return Promise.resolve({
                data: options.rows ?? [],
                error: options.error ? { message: options.error } : null,
              });
            },
          };
        },
      };
    },
  };
}

function createSourceRow(id: string, state: string) {
  return {
    id,
    name: `${state} Test Source`,
    jurisdiction: {
      country: "US",
      state,
    },
    agency: {
      name: `${state} Test Agency`,
      url: "https://example.gov/",
    },
    source_type: "html_lookup",
    source_url: "https://example.gov/source",
    documentation_url: "https://example.gov/docs",
    adapter_status: "planned",
    adapter_maturity: "registry_only",
    source_discovery_status: "researched",
    coverage_scope: "state_agency_partial",
    redistribution_status: "unknown",
    metadata: {
      dataDictionaryUrl: null,
      termsUrl: "https://example.gov/terms",
      updateFrequency: "unknown",
      tradeCoverage: ["home_improvement"],
      licenseTypesIncluded: ["test records"],
      knownExclusions: ["test exclusions"],
      hasBulkDownload: "unknown",
      hasLiveLookup: true,
      requiresJavaScript: "unknown",
      requiresCaptcha: "unknown",
      requiresAccount: false,
      rateLimitNotes: "test rate limit notes",
      publicRecordsNotes: "test public records notes",
      adapterPackage: `@opentrade/adapter-${state.toLowerCase()}-test`,
      testFixturePath: null,
      officialLookupUrl: "https://example.gov/lookup",
      officialBulkDownloadNotes: "none",
      researchNotes: "test research notes",
      maintainerNotes: "test maintainer notes",
    },
    last_verified_at: "2026-06-22T00:00:00.000Z",
  };
}
