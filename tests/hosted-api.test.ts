import { describe, expect, it } from "vitest";
import healthHandler from "../api/health.js";
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
    expect(response.body.count).toBe(24);
    expect(response.body.sources.some((source: { id: string }) => source.id === "us.fl.dbpr.construction")).toBe(true);
  });

  it("returns a single source registry entry by id", async () => {
    const response = createMockResponse();
    await sourcesHandler({ query: { id: "us.oh.commerce.ocilb_contractors" } } as never, response as never);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      id: "us.oh.commerce.ocilb_contractors",
      adapterMaturity: "registry_only"
    });
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
