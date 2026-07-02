import { mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const packageRoot = join(root, "packages");
const packageDirectories = (await readdir(packageRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(packageRoot, entry.name))
  .sort();
const publicPackages = [];
for (const directory of packageDirectories) {
  const manifest = JSON.parse(await readFile(join(directory, "package.json"), "utf8").catch(() => "null"));
  if (manifest && manifest.private !== true) publicPackages.push({ directory, manifest });
}

const temporaryRoot = await mkdtemp(join(tmpdir(), "opentrade-pack-check-"));
const tarballDirectory = join(temporaryRoot, "tarballs");
const smokeDirectory = join(temporaryRoot, "smoke");
const tarballs = [];

try {
  await mkdir(tarballDirectory, { recursive: true });
  await mkdir(smokeDirectory, { recursive: true });
  for (const packageInfo of publicPackages) {
    const before = new Set(await readdir(tarballDirectory).catch(() => []));
    run("corepack", ["pnpm", "pack", "--pack-destination", tarballDirectory], packageInfo.directory);
    const created = (await readdir(tarballDirectory)).filter((file) => file.endsWith(".tgz") && !before.has(file));
    if (created.length !== 1) throw new Error(`Expected one tarball for ${packageInfo.manifest.name}, received ${created.length}.`);
    const tarball = join(tarballDirectory, created[0]);
    tarballs.push(tarball);

    const packedManifest = JSON.parse(run("tar", ["-xOzf", tarball, "package/package.json"], root));
    if (packedManifest.name !== packageInfo.manifest.name || packedManifest.version !== packageInfo.manifest.version) {
      throw new Error(`Packed manifest mismatch for ${packageInfo.manifest.name}.`);
    }
    if (JSON.stringify(packedManifest).includes("workspace:")) throw new Error(`${packageInfo.manifest.name} tarball retains a workspace protocol dependency.`);
    const files = run("tar", ["-tzf", tarball], root).trim().split("\n");
    if (files.some((file) => file.includes("node_modules/") || file.includes("/tests/") || file.endsWith(".tsbuildinfo"))) {
      throw new Error(`${packageInfo.manifest.name} tarball contains development-only files.`);
    }
    console.log(`${packedManifest.name}@${packedManifest.version} (${files.length} files)`);
  }

  run("npm", ["init", "--yes"], smokeDirectory);
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", ...tarballs], smokeDirectory);
  const imports = publicPackages
    .filter(({ manifest }) => manifest.name !== "@opentrade-registry/cli")
    .map(({ manifest }) => `await import(${JSON.stringify(manifest.name)});`)
    .concat("const exitCodes = await import('@opentrade-registry/cli/exit-codes'); if (exitCodes.OPENTRADE_CLI_EXIT_CODES.validationFailed !== 6) throw new Error('Packed CLI exit-code contract mismatch.');")
    .join("");
  run(process.execPath, ["--input-type=module", "--eval", imports], smokeDirectory);
  const cliBinary = join(smokeDirectory, "node_modules", ".bin", process.platform === "win32" ? "opentrade.cmd" : "opentrade");
  const help = run(cliBinary, ["help"], smokeDirectory);
  if (!help.includes("OpenTrade Registry CLI")) throw new Error("Packed CLI smoke test did not return expected help output.");
  const sources = JSON.parse(run(cliBinary, ["sources", "list", "--json"], smokeDirectory));
  if (!Array.isArray(sources) || sources.length !== 74) {
    throw new Error(`Packed CLI source registry smoke test expected 74 entries, received ${Array.isArray(sources) ? sources.length : "invalid JSON"}.`);
  }
  const coverage = JSON.parse(run(cliBinary, ["sources", "coverage", "--json"], smokeDirectory));
  if (coverage.stateCount !== 51 || coverage.territoryCount !== 5) {
    throw new Error(`Packed CLI coverage smoke test expected 51 state rows and 5 territory rows, received ${coverage.stateCount} and ${coverage.territoryCount}.`);
  }
  console.log(`Clean-install smoke passed for ${tarballs.length} package tarballs.`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", env: { ...process.env, npm_config_provenance: "false" } });
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`${basename(command)} failed with exit code ${result.status ?? "unknown"}.`);
  }
  return result.stdout;
}
