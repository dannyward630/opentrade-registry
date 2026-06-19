import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([".git", "node_modules"]);
const forbiddenFileNames = new Set(["out.jsonl", "out.csv"]);
const forbiddenExtensions = [".sqlite", ".db"];
const findings = [];

await scanDirectory(root);

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(`Generated or local-only output found: ${finding}`);
  }
  process.exitCode = 1;
}

async function scanDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await scanDirectory(path);
      }
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (forbiddenFileNames.has(entry.name) || forbiddenExtensions.some((extension) => entry.name.endsWith(extension))) {
      findings.push(relative(root, path));
    }
  }
}

