import { createDeveloperKeyService } from "./api-keys.js";
import { createPostgresDeveloperKeyStore } from "./postgres-api-keys.js";
import type { SqlClient } from "./postgres.js";
import { createSupabaseIdentityVerifier, type SupabaseClaimsClient } from "./supabase-auth.js";

type SupabaseClientFactory = (
  url: string,
  publishableKey: string,
  options: { auth: { autoRefreshToken: false; persistSession: false; detectSessionInUrl: false } },
) => SupabaseClaimsClient;

export function createRuntimeAuth(input: {
  environment: Record<string, string | undefined>;
  sqlClient: SqlClient;
  createSupabaseClient: SupabaseClientFactory;
}) {
  const url = input.environment.SUPABASE_URL?.trim();
  const publishableKey = input.environment.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (Boolean(url) !== Boolean(publishableKey)) throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must both be configured.");
  if (!url || !publishableKey) return {};

  const client = input.createSupabaseClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  return {
    identityVerifier: createSupabaseIdentityVerifier(client),
    developerKeyService: createDeveloperKeyService(createPostgresDeveloperKeyStore(input.sqlClient)),
  };
}
