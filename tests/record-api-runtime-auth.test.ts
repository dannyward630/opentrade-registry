import { describe, expect, it, vi } from "vitest";
import { createRuntimeAuth } from "../services/record-api/src/runtime-auth.js";

describe("record API runtime authentication", () => {
  it("enables Supabase identity and Postgres developer keys together", async () => {
    const getClaims = vi.fn(async () => ({ data: { claims: { sub: "user-1" } }, error: null }));
    const createSupabaseClient = vi.fn(() => ({ auth: { getClaims } }));
    const query = vi.fn();
    const runtime = createRuntimeAuth({
      environment: { SUPABASE_URL: "https://project.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example" },
      sqlClient: { query },
      createSupabaseClient,
    });
    await expect(runtime.identityVerifier?.verify("Bearer token")).resolves.toEqual({ userId: "user-1" });
    expect(createSupabaseClient).toHaveBeenCalledWith("https://project.supabase.co", "sb_publishable_example", expect.objectContaining({ auth: expect.any(Object) }));
    expect(runtime.developerKeyService).toBeDefined();
  });

  it("keeps public reads available when Supabase credentials are absent", () => {
    const runtime = createRuntimeAuth({ environment: {}, sqlClient: { query: vi.fn() }, createSupabaseClient: vi.fn() });
    expect(runtime.identityVerifier).toBeUndefined();
    expect(runtime.developerKeyService).toBeUndefined();
  });

  it("rejects partial Supabase configuration", () => {
    expect(() => createRuntimeAuth({
      environment: { SUPABASE_URL: "https://project.supabase.co" }, sqlClient: { query: vi.fn() }, createSupabaseClient: vi.fn(),
    })).toThrow(/both/i);
  });
});
