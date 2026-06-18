import { ZodError } from "zod";
import { loadSourceRegistry } from "./sources.js";

export async function validateSources(rootDir: string, options: { json?: boolean }) {
  try {
    const entries = await loadSourceRegistry(rootDir);
    const result = {
      ok: true,
      sourceCount: entries.length,
      sourceIds: entries.map((entry) => entry.id),
    };
    console.log(options.json ? JSON.stringify(result, null, 2) : `Validated ${entries.length} source registry entries.`);
  } catch (error) {
    const message = error instanceof ZodError ? error.issues.map((issue) => issue.message).join("; ") : error instanceof Error ? error.message : String(error);
    throw Object.assign(new Error(`Source registry validation failed: ${message}`), { exitCode: 6 });
  }
}

