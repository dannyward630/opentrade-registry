import { describe, expect, it } from "vitest";
import healthHandler, { getHealthStatus } from "../api/health.js";
import readinessHandler from "../api/readiness.js";
import {
  loadSourceReadinessForApi,
  loadSourcesForApi,
  loadSourcesFromDatabase,
  loadSourcesFromFiles,
  type RegistryDatabaseClient,
} from "../api/registry.js";
import sourcesHandler, { filterSourcesForApi } from "../api/sources.js";

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
    expect(response.body.apiVersion).toBe("1.0");
    expect(response.headers["Cache-Control"]).toBe("no-store");
    expect(response.headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(response.body).toMatchObject({
      ok: true,
      service: "opentrade-registry",
      fileRegistrySourceCount: 68,
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
    expect(response.body.apiVersion).toBe("1.0");
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(response.headers["Cache-Control"]).toContain("stale-while-revalidate");
    expect(response.body.origin).toBe("registry_files");
    expect(response.body.count).toBe(68);
    expect(response.body.sources.some((source: { id: string }) => source.id === "us.fl.dbpr.construction")).toBe(true);
  });

  it("filters source registry entries from local metadata", async () => {
    const implemented = createMockResponse();
    await sourcesHandler({ query: { implemented: "true" } } as never, implemented as never);

    expect(implemented.statusCode).toBe(200);
    expect(implemented.body.count).toBe(9);
    expect(implemented.body.filters.implemented).toBe(true);
    expect(implemented.body.sources.map((source: { id: string }) => source.id)).toEqual([
      "us.az.roc.contractors",
      "us.ca.cslb.contractors",
      "us.fl.dbpr.asbestos_contractors",
      "us.fl.dbpr.construction",
      "us.fl.dbpr.electrical_contractors",
      "us.mn.dli.licenses_registrations",
      "us.or.ccb.active_licenses",
      "us.tx.tdlr.all_licenses",
      "us.wa.lni.contractors",
    ]);

    const california = createMockResponse();
    await sourcesHandler({ query: { state: "ca", maturity: "local_file_adapter" } } as never, california as never);
    expect(california.statusCode).toBe(200);
    expect(california.body.count).toBe(1);
    expect(california.body.filters.state).toBe("CA");
    expect(california.body.sources[0].id).toBe("us.ca.cslb.contractors");

    const bulkCandidates = createMockResponse();
    await sourcesHandler({ query: { bulkCandidates: "true" } } as never, bulkCandidates as never);
    expect(bulkCandidates.statusCode).toBe(200);
    expect(bulkCandidates.body.count).toBe(0);
    expect(bulkCandidates.body.sources.map((source: { id: string }) => source.id)).toEqual([]);

    const blocked = createMockResponse();
    await sourcesHandler({ query: { researchOutcome: "blocked" } } as never, blocked as never);
    expect(blocked.statusCode).toBe(200);
    expect(blocked.body.count).toBe(59);
    expect(blocked.body.filters.researchOutcome).toBe("blocked");
    expect(blocked.body.sources.map((source: { id: string }) => source.id)).toContain("us.pa.oag.home_improvement_contractors");
    expect(blocked.body.sources[0]).toHaveProperty("sourceResearchOutcome", "blocked");
    expect(blocked.body.sources[0]).toHaveProperty("nextAction");
  });

  it("rejects invalid source filters", async () => {
    const response = createMockResponse();
    await sourcesHandler({ query: { maturity: "fixture" } } as never, response as never);

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: "invalid_filter",
      message: expect.stringContaining("Invalid maturity filter"),
    });
  });

  it("returns source readiness from local metadata", async () => {
    const response = createMockResponse();
    await readinessHandler({ query: {} } as never, response as never);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      origin: "registry_files",
      sourceCount: 68,
      terminalSourceCount: 68,
      blockedSourceCount: 59,
      registryOnlySourceCount: 0,
      note: expect.stringContaining("terminal"),
    });
    expect(response.body.implementedAdapterSources.map((source: { id: string }) => source.id)).toEqual([
      "us.az.roc.contractors",
      "us.ca.cslb.contractors",
      "us.fl.dbpr.asbestos_contractors",
      "us.fl.dbpr.construction",
      "us.fl.dbpr.electrical_contractors",
      "us.mn.dli.licenses_registrations",
      "us.or.ccb.active_licenses",
      "us.tx.tdlr.all_licenses",
      "us.wa.lni.contractors",
    ]);
    expect(response.body.unimplementedBulkAdapterCandidates.map((source: { id: string }) => source.id)).toEqual([]);
    expect(response.body.downloadResearchCandidates).toEqual([]);
    expect(response.body.lookupAutomationConstraintSources).toEqual([]);
    expect(response.body.sourcesByResearchOutcome.blocked).toBe(59);
  });

  it("returns a single source registry entry by id", async () => {
    const response = createMockResponse();
    await sourcesHandler({ query: { id: "us.oh.commerce.ocilb_contractors" } } as never, response as never);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      id: "us.oh.commerce.ocilb_contractors",
      adapterMaturity: "blocked",
      sourceResearchOutcome: "blocked",
      nextAction: expect.stringContaining("protected interactive access"),
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

  it("filters database-backed source registry entries", async () => {
    const result = await loadSourcesForApi({
      databaseClient: createFakeDatabaseClient({
        rows: [
          {
            ...createSourceRow("us.fl.dbpr.construction", "FL"),
            source_type: "bulk_csv",
            adapter_status: "implemented",
            adapter_maturity: "local_file_adapter",
          },
          createSourceRow("us.ct.dcp.home_improvement_contractors", "CT"),
        ],
      }),
    });

    expect(result.origin).toBe("database");
    expect(result.sources).toHaveLength(2);

    const filtered = filterSourcesForApi(result.sources, { status: "implemented" });
    expect(filtered.filters.status).toBe("implemented");
    expect(filtered.sources.map((source) => source.id)).toEqual(["us.fl.dbpr.construction"]);
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
            adapter_status: "implemented",
            adapter_maturity: "fixture_adapter",
            metadata: {
              ...createSourceRow("us.ca.cslb.contractors", "CA").metadata,
              hasBulkDownload: true,
              adapterQualityLevel: 4,
            },
          },
        ],
      }),
    });

    expect(result.origin).toBe("database");
    expect(result.sourceCount).toBe(2);
    expect(result.implementedAdapterSources.map((source) => source.id)).toEqual(["us.fl.dbpr.construction", "us.ca.cslb.contractors"]);
    expect(result.unimplementedBulkAdapterCandidates.map((source) => source.id)).toEqual([]);
    expect(result.registryOnlySourceCount).toBe(0);
    expect(result.sourcesByResearchOutcome.local_file_adapter).toBe(1);
    expect(result.sourcesByResearchOutcome.network_opt_in).toBe(1);
  });

  it("fills legacy partial database metadata from registry files before validation", async () => {
    const result = await loadSourcesForApi({
      databaseClient: createFakeDatabaseClient({
        rows: [
          {
            ...createSourceRow("us.fl.dbpr.construction", "FL"),
            metadata: {
              adapterPackage: "@opentrade-registry/adapter-fl-dbpr",
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
    expect(result.databaseError).toBe("database_unavailable");
    expect(result.sources).toHaveLength(68);
  });

  it("returns file-backed readiness when database source loading fails", async () => {
    const result = await loadSourceReadinessForApi({
      databaseClient: createFakeDatabaseClient({
        error: "database unavailable",
      }),
    });

    expect(result.origin).toBe("registry_files");
    expect(result.databaseError).toBe("database_unavailable");
    expect(result.sourceCount).toBe(68);
    expect(result.unimplementedBulkAdapterCandidates).toHaveLength(0);
  });

  it("reports matching database and file source counts when database count succeeds", async () => {
    const fileSources = await loadSourcesFromFiles();
    const health = await getHealthStatus({
      databaseClient: createFakeDatabaseClient({
        rows: fileSources.map(createDatabaseRowFromSource),
      }),
    });

    expect(health.statusCode).toBe(200);
    expect(health.body).toMatchObject({
      ok: true,
      fileRegistrySourceCount: 68,
      database: {
        configured: true,
        status: "available",
        registrySourceCount: 68,
        sourceCountMatchesFiles: true,
        sourceMetadataMatchesFiles: true,
        sourceMetadataMismatchCount: 0,
      }
    });
  });

  it("reports unhealthy when database source metadata drifts from registry files", async () => {
    const fileSources = await loadSourcesFromFiles();
    const rows = fileSources.map(createDatabaseRowFromSource);
    const california = rows.find((row) => row.id === "us.ca.cslb.contractors");
    expect(california).toBeDefined();
    california!.adapter_status = "planned";
    california!.adapter_maturity = "registry_only";

    const health = await getHealthStatus({
      databaseClient: createFakeDatabaseClient({ rows }),
    });

    expect(health.statusCode).toBe(503);
    expect(health.body).toMatchObject({
      ok: false,
      database: {
        configured: true,
        status: "available",
        registrySourceCount: 68,
        sourceCountMatchesFiles: true,
        sourceMetadataMatchesFiles: false,
        sourceMetadataMismatchCount: 1,
        sourceMetadataMismatches: [
          {
            id: "us.ca.cslb.contractors",
            reason: "content_mismatch",
          },
        ],
      },
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
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
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
      adapterPackage: `@opentrade-registry/adapter-${state.toLowerCase()}-test`,
      testFixturePath: null,
      officialLookupUrl: "https://example.gov/lookup",
      officialBulkDownloadNotes: "none",
      researchNotes: "test research notes",
      maintainerNotes: "test maintainer notes",
    },
    last_verified_at: "2026-06-22T00:00:00.000Z",
  };
}

function createDatabaseRowFromSource(source: Awaited<ReturnType<typeof loadSourcesFromFiles>>[number]) {
  const metadata = { ...source } as Record<string, unknown>;
  for (const key of [
    "id",
    "name",
    "jurisdiction",
    "agency",
    "sourceType",
    "sourceUrl",
    "documentationUrl",
    "adapterStatus",
    "adapterMaturity",
    "sourceDiscoveryStatus",
    "coverageScope",
    "redistributionStatus",
    "lastVerifiedAt",
  ]) {
    delete metadata[key];
  }

  return {
    id: source.id,
    name: source.name,
    jurisdiction: source.jurisdiction,
    agency: source.agency,
    source_type: source.sourceType,
    source_url: source.sourceUrl,
    documentation_url: source.documentationUrl,
    adapter_status: source.adapterStatus,
    adapter_maturity: source.adapterMaturity,
    source_discovery_status: source.sourceDiscoveryStatus,
    coverage_scope: source.coverageScope,
    redistribution_status: source.redistributionStatus,
    metadata,
    last_verified_at: source.lastVerifiedAt ?? null,
  };
}
