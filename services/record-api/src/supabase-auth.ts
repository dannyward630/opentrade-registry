export type VerifiedIdentity = { userId: string };

export interface IdentityVerifier {
  verify(authorizationHeader: string | null): Promise<VerifiedIdentity>;
}

export type SupabaseClaimsClient = {
  auth: {
    getClaims(token: string): Promise<{
      data: { claims?: { sub?: unknown } } | null;
      error: unknown;
    }>;
  };
};

export function createSupabaseIdentityVerifier(client: SupabaseClaimsClient): IdentityVerifier {
  return {
    async verify(authorizationHeader) {
      const token = authorizationHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
      if (!token) throw new AuthenticationError();
      const { data, error } = await client.auth.getClaims(token);
      const subject = data?.claims?.sub;
      if (error || typeof subject !== "string" || !subject) throw new AuthenticationError();
      return { userId: subject };
    },
  };
}

export class AuthenticationError extends Error {
  constructor() {
    super("Authentication required.");
  }
}
