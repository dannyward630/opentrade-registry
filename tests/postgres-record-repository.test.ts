import { describe, expect, it, vi } from "vitest";
import { createPostgresRecordRepository, type SqlClient } from "../services/record-api/src/postgres.js";

describe("Postgres record repository", () => {
  it("parameterizes search values and filters to publication-approved records", async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    const repository = createPostgresRecordRepository({ query } as SqlClient);
    await repository.searchLicenses({
      licenseNumber: "CGC1234567",
      businessName: "Example Builders",
      state: "FL",
      sourceId: "us.fl.dbpr.construction",
      status: "active",
      trade: "general_contracting",
      limit: 25,
    });

    const [sql, values] = query.mock.calls[0]!;
    expect(sql).toContain("publication_disposition = 'allowed'");
    expect(sql).toContain("license_number_normalized = $1");
    expect(sql).not.toContain("CGC1234567");
    expect(values).toContain("CGC1234567");
    expect(values).toContain("%Example Builders%");
  });

  it("enqueues verification jobs without interpolating user input", async () => {
    const query = vi.fn(async () => ({ rows: [{ id: "job-1", status: "pending" }] }));
    const repository = createPostgresRecordRepository({ query } as SqlClient);
    await expect(repository.enqueueVerification({ sourceId: "us.example.lookup", licenseNumber: "ABC123" })).resolves.toEqual({ id: "job-1", status: "pending" });
    const [sql, values] = query.mock.calls[0]!;
    expect(sql).not.toContain("ABC123");
    expect(values).toEqual(["us.example.lookup", JSON.stringify({ sourceId: "us.example.lookup", licenseNumber: "ABC123" })]);
  });
});
