import { createClient } from "@supabase/supabase-js";
import type { ApiRequest, ApiResponse } from "./types.js";

export default async function handler(_request: ApiRequest, response: ApiResponse) {
  const supabaseUrl = process.env.OPENTRADE_SUPABASE_URL;
  const supabaseAnonKey = process.env.OPENTRADE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    response.status(200).json({
      ok: true,
      service: "opentrade-registry",
      database: {
        configured: false,
        status: "not_configured"
      }
    });
    return;
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false
    }
  });

  const { count, error } = await client.from("registry_sources").select("id", { count: "exact", head: true });

  response.status(error ? 503 : 200).json({
    ok: !error,
    service: "opentrade-registry",
    database: {
      configured: true,
      status: error ? "unavailable" : "available",
      registrySourceCount: count ?? 0,
      error: error?.message
    }
  });
}
