import { spawnSync } from "node:child_process";
import { join } from "node:path";

const packages = [
  "packages/core",
  "packages/adapter-ak-commerce",
  "packages/adapter-ca-cslb",
  "packages/adapter-fl-dbpr",
  "packages/adapter-in-pla",
  "packages/adapter-mn-dli",
  "packages/adapter-or-ccb",
  "packages/adapter-tx-tdlr",
  "packages/adapter-wa-lni",
  "packages/storage-sqlite",
  "packages/cli",
];

for (const packageDir of packages) {
  const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: join(process.cwd(), packageDir),
    encoding: "utf8",
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  const [packInfo] = JSON.parse(result.stdout);
  const files = packInfo.files.map((file) => file.path).sort();
  console.log(`${packInfo.name}@${packInfo.version}`);
  for (const file of files) {
    console.log(`  ${file}`);
  }
}
