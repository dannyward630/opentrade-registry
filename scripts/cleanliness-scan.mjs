import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([".git", "node_modules", "dist", ".vite"]);
const ignoredFiles = new Set(["pnpm-lock.yaml"]);
const terms = [
  [77, 97, 116, 116, 8217, 115, 32, 76, 105, 115, 116],
  [77, 97, 116, 116, 39, 115, 32, 76, 105, 115, 116],
  [77, 97, 116, 116, 115, 76, 105, 115, 116],
  [109, 97, 116, 116],
  [99, 111, 110, 116, 114, 97, 99, 116, 111, 114, 32, 114, 101, 118, 105, 101, 119],
  [114, 101, 118, 105, 101, 119, 115],
  [98, 105, 108, 108, 105, 110, 103],
  [80, 114, 105, 115, 109, 97],
  [78, 101, 120, 116, 46, 106, 115],
  [97, 100, 109, 105, 110, 32, 99, 111, 110, 116, 114, 97, 99, 116, 111, 114, 115],
  [114, 105, 115, 107, 32, 115, 99, 111, 114, 101],
  [112, 114, 111, 102, 105, 108, 101, 32, 97, 112, 112, 114, 111, 118, 97, 108],
  [112, 114, 105, 118, 97, 116, 101, 32, 97, 112, 112],
  [117, 115, 101, 114, 32, 111, 110, 98, 111, 97, 114, 100, 105, 110, 103],
].map((codes) => String.fromCodePoint(...codes).toLowerCase());

const findings = [];
await scanDirectory(root);

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line}: forbidden phrase detected`);
  }
  process.exitCode = 1;
}

async function scanDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    const rel = relative(root, path);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await scanDirectory(path);
      }
      continue;
    }

    if (!entry.isFile() || ignoredFiles.has(entry.name)) {
      continue;
    }

    const content = await readFile(path, "utf8").catch(() => null);
    if (content === null) {
      continue;
    }

    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const lowerLine = lines[index].toLowerCase();
      if (terms.some((term) => lowerLine.includes(term))) {
        findings.push({ file: rel, line: index + 1 });
      }
    }
  }
}
