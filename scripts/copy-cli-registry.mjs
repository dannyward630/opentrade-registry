import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceRegistry = join(root, "registry");
const bundledRegistry = join(root, "packages", "cli", "dist", "registry");

await rm(bundledRegistry, { recursive: true, force: true });
await mkdir(bundledRegistry, { recursive: true });
await cp(join(sourceRegistry, "sources"), join(bundledRegistry, "sources"), { recursive: true });
await cp(join(sourceRegistry, "us-coverage.json"), join(bundledRegistry, "us-coverage.json"));
await cp(join(sourceRegistry, "us-territory-coverage.json"), join(bundledRegistry, "us-territory-coverage.json"));

console.log("Bundled source registry for the CLI package.");
