import { describe, expect, it, vi } from "vitest";
import { createSupabaseIdentityVerifier } from "../services/record-api/src/supabase-auth.js";

describe("Supabase identity verification", () => {
  it("accepts a server-verified subject claim", async () => {
    const getClaims = vi.fn(async () => ({ data: { claims: { sub: "user-1" } }, error: null }));
    const verifier = createSupabaseIdentityVerifier({ auth: { getClaims } });
    await expect(verifier.verify("Bearer access-token")).resolves.toEqual({ userId: "user-1" });
    expect(getClaims).toHaveBeenCalledWith("access-token");
  });

  it("rejects missing and invalid bearer tokens neutrally", async () => {
    const verifier = createSupabaseIdentityVerifier({ auth: { getClaims: vi.fn(async () => ({ data: null, error: new Error("invalid") })) } });
    await expect(verifier.verify(null)).rejects.toThrow(/authentication required/i);
    await expect(verifier.verify("Bearer invalid")).rejects.toThrow(/authentication required/i);
  });
});
