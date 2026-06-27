import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const output = join(root, "release-artifacts");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const packageDirectories = (await readdir(join(root, "packages"), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(root, "packages", entry.name))
  .sort();

for (const directory of packageDirectories) {
  const manifest = JSON.parse(await readFile(join(directory, "package.json"), "utf8").catch(() => "null"));
  if (!manifest || manifest.private === true) continue;
  run("corepack", ["pnpm", "pack", "--pack-destination", output], directory);
}

const tarballs = (await readdir(output)).filter((file) => file.endsWith(".tgz")).sort();
if (tarballs.length === 0) throw new Error("No release tarballs were created.");
const checksums = [];
for (const file of tarballs) {
  const bytes = await readFile(join(output, file));
  checksums.push(`${createHash("sha256").update(bytes).digest("hex")}  ${file}`);
}
await writeFile(join(output, "SHA256SUMS"), `${checksums.join("\n")}\n`, "utf8");
console.log(`Packed ${tarballs.length} release artifacts with SHA-256 manifest.`);

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", env: { ...process.env, npm_config_provenance: "false" } });
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`${command} failed with exit code ${result.status ?? "unknown"}.`);
  }
}
