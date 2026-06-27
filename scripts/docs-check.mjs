import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";

const root = process.cwd();
const roots = [
  "README.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CODE_OF_CONDUCT.md",
  "docs",
  "examples",
  "packages",
];
const markdownFiles = [];

for (const entry of roots) {
  await collectMarkdown(resolve(root, entry));
}

const failures = [];
for (const file of markdownFiles.sort()) {
  const markdown = await readFile(file, "utf8");
  const withoutFences = markdown.replace(/```[\s\S]*?```/g, "");
  for (const match of withoutFences.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    const target = rawTarget.split(/\s+["']/)[0];
    if (!target || target.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;

    const decoded = decodeURIComponent(target.split("#")[0].split("?")[0]);
    if (!decoded) continue;
    const destination = decoded.startsWith("/") ? resolve(root, `.${decoded}`) : resolve(dirname(file), decoded);
    try {
      await access(destination);
    } catch {
      failures.push(`${relative(file)} -> ${rawTarget}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Broken local Markdown links:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Validated local links in ${markdownFiles.length} Markdown files.`);
}

async function collectMarkdown(path) {
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch {
    if (extname(path) === ".md") markdownFiles.push(path);
    return;
  }

  for (const entry of entries) {
    if (["node_modules", "dist", ".git", "release-artifacts"].includes(entry.name)) continue;
    const child = join(path, entry.name);
    if (entry.isDirectory()) await collectMarkdown(child);
    else if (entry.isFile() && extname(entry.name) === ".md") markdownFiles.push(child);
  }
}

function relative(path) {
  return path.slice(root.length + 1);
}
