import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const expected = (process.env.OPENTRADE_RELEASE_VERSION ?? process.env.GITHUB_REF_NAME ?? "").replace(/^v/, "");
if (!expected) throw new Error("Set OPENTRADE_RELEASE_VERSION or GITHUB_REF_NAME to the release tag/version.");

const manifests = ["package.json", "apps/web/package.json"];
for (const entry of await readdir("packages", { withFileTypes: true })) {
  if (entry.isDirectory()) manifests.push(join("packages", entry.name, "package.json"));
}

for (const path of manifests.sort()) {
  const manifest = JSON.parse(await readFile(path, "utf8"));
  if (manifest.version !== expected) throw new Error(`${path} is ${manifest.version}; expected ${expected}.`);
}
console.log(`All workspace manifests match ${expected}.`);
