import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { sourceRegistryEntrySchema } from "@opentrade/core";
import type { ApiRequest, ApiResponse } from "./types.js";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const sources = await loadSources();
  const sourceId = typeof request.query.id === "string" ? request.query.id : null;

  if (sourceId) {
    const source = sources.find((entry) => entry.id === sourceId);
    if (!source) {
      response.status(404).json({
        error: "not_found",
        message: "No matching source registry entry was found."
      });
      return;
    }

    response.status(200).json(source);
    return;
  }

  response.status(200).json({
    count: sources.length,
    sources
  });
}

async function loadSources() {
  const sourceRoot = join(process.cwd(), "registry", "sources");
  const files = await listJsonFiles(sourceRoot);
  const sources = [];

  for (const file of files) {
    const content = JSON.parse(await readFile(file, "utf8"));
    sources.push(sourceRegistryEntrySchema.parse(content));
  }

  return sources.sort((a, b) => a.id.localeCompare(b.id));
}

async function listJsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(path)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(path);
    }
  }

  return files;
}
