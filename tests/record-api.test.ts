import { describe, expect, it, vi } from "vitest";
import { createRecordApi, type RecordRepository, type StoredLicenseRecord } from "../services/record-api/src/index.js";

const record: StoredLicenseRecord = {
  id: "record-1",
  sourceId: "us.fl.dbpr.construction",
  sourceSnapshotId: "snapshot-1",
  recordVersion: "version-1",
  jurisdictionState: "FL",
  licenseNumber: "CGC1234567",
  licenseNumberNormalized: "CGC1234567",
  businessName: "EXAMPLE BUILDERS LLC",
  licenseeName: "EXAMPLE OWNER",
  normalizedStatus: "active",
  tradeCategories: ["general_contracting"],
  observedAt: "2026-06-29T00:00:00.000Z",
  publicationDisposition: "allowed",
  sensitivityLevel: "business_only",
  sourceUrl: "https://example.gov/licenses.csv",
  caveats: ["Coverage is limited to the named source."],
  canonicalRecord: { schemaVersion: "2.0" },
};

describe("v2 record API", () => {
  it("searches indexed records with source context", async () => {
    const repository = fakeRepository({ records: [record] });
    const api = createRecordApi({ repository, sources: [source()], boardInventory: inventory() });
    const response = await api(new Request("https://api.example.test/api/v2/licenses/search?license=CGC1234567&state=FL"));
    const body = await response.json() as { apiVersion: string; records: StoredLicenseRecord[] };
    expect(response.status).toBe(200);
    expect(body.apiVersion).toBe("2.0");
    expect(body.records[0]).toMatchObject({ id: "record-1", sourceUrl: "https://example.gov/licenses.csv" });
    expect(repository.searchLicenses).toHaveBeenCalledWith(expect.objectContaining({ licenseNumber: "CGC1234567", state: "FL", limit: 25 }));
  });

  it("returns one published record by ID", async () => {
    const api = createRecordApi({ repository: fakeRepository({ record }), sources: [source()], boardInventory: inventory() });
    const response = await api(new Request("https://api.example.test/api/v2/licenses/record-1"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ record: { id: "record-1", recordVersion: "version-1" } });
  });

  it("returns indexed, manual, pending, and unavailable verification semantics", async () => {
    const indexed = createRecordApi({ repository: fakeRepository({ records: [record] }), sources: [source()], boardInventory: inventory() });
    expect(await resultOf(indexed, "us.fl.dbpr.construction")).toBe("indexed_match");

    const manual = createRecordApi({ repository: fakeRepository(), sources: [source({ id: "us.nv.manual", officialLookupUrl: "https://example.gov/lookup" })], boardInventory: inventory("us.nv.manual", "manual_handoff") });
    const manualResponse = await resultBody(manual, "us.nv.manual");
    expect(manualResponse).toMatchObject({ result: "manual_required", manualHandoff: { url: "https://example.gov/lookup" } });

    const pending = createRecordApi({ repository: fakeRepository(), sources: [source({ id: "us.example.browser" })], boardInventory: inventory("us.example.browser", "browser_lookup") });
    expect(await resultOf(pending, "us.example.browser")).toBe("pending");

    const unavailable = createRecordApi({ repository: fakeRepository(), sources: [source({ id: "us.example.blocked" })], boardInventory: inventory("us.example.blocked", "blocked") });
    expect(await resultOf(unavailable, "us.example.blocked")).toBe("source_unavailable");
  });

  it("rejects unbounded or missing search input", async () => {
    const api = createRecordApi({ repository: fakeRepository(), sources: [source()], boardInventory: inventory() });
    const response = await api(new Request("https://api.example.test/api/v2/licenses/search?limit=1000"));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "invalid_request" } });
  });
});

function fakeRepository(input: { records?: StoredLicenseRecord[]; record?: StoredLicenseRecord } = {}): RecordRepository {
  return {
    searchLicenses: vi.fn(async () => ({ records: input.records ?? [], nextCursor: null })),
    getLicense: vi.fn(async () => input.record ?? null),
    enqueueVerification: vi.fn(async () => ({ id: "job-1", status: "pending" as const })),
    getVerificationJob: vi.fn(async () => null),
  };
}

function source(overrides: Record<string, unknown> = {}) {
  return {
    id: "us.fl.dbpr.construction",
    name: "Example source",
    officialLookupUrl: "https://example.gov/lookup",
    sourceUrl: "https://example.gov/licenses.csv",
    verificationCaveats: ["Coverage is limited."],
    ...overrides,
  } as never;
}

function inventory(sourceId = "us.fl.dbpr.construction", accessPath = "network_opt_in") {
  return {
    schemaVersion: "2.0",
    completeness: "representative_source_baseline",
    scope: { jurisdictions: "states_dc_major_territories", municipalLicensing: "excluded", notes: ["Fixture."] },
    boards: [{
      id: sourceId,
      jurisdiction: { country: "US", state: "FL" },
      boardName: "Example board",
      agencyName: "Example agency",
      officialUrl: "https://example.gov/lookup",
      sourceIds: [sourceId],
      trades: ["general contracting"],
      accessPath,
      coverageLimitations: ["Municipal licenses."],
      evidence: { url: "https://example.gov/lookup", reviewedAt: "2026-06-29T00:00:00.000Z", note: "Fixture." },
    }],
  } as never;
}

async function resultOf(api: ReturnType<typeof createRecordApi>, sourceId: string): Promise<string> {
  return (await resultBody(api, sourceId)).result as string;
}

async function resultBody(api: ReturnType<typeof createRecordApi>, sourceId: string): Promise<Record<string, unknown>> {
  const response = await api(new Request("https://api.example.test/api/v2/verifications", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceId, licenseNumber: "CGC1234567" }),
  }));
  expect(response.status).toBe(200);
  return response.json() as Promise<Record<string, unknown>>;
}
