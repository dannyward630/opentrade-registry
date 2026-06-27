import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";

const root = process.cwd();
const docsRoot = join(root, "docs");
const outputRoot = join(root, "wiki-export");
const repositoryBlobUrl = "https://github.com/dannyward630/opentrade-registry/blob/main";

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const sourceFiles = await collectMarkdown(docsRoot);
const pages = [];
for (const sourcePath of sourceFiles.sort()) {
  const docsRelativePath = relative(docsRoot, sourcePath);
  const repositoryPath = `docs/${toPosix(docsRelativePath)}`;
  const pageName = docsRelativePath.replace(/\.md$/i, "").split(sep).join("--");
  const outputPath = join(outputRoot, `${pageName}.md`);
  const markdown = await readFile(sourcePath, "utf8");
  const title = markdown.match(/^#\s+(.+)$/m)?.[1] ?? pageName;
  const rewritten = rewriteRelativeLinks(markdown, repositoryPath);
  await writeFile(outputPath, `${rewritten.trimEnd()}\n\n---\n\n[Canonical source](${repositoryBlobUrl}/${repositoryPath})\n`, "utf8");
  pages.push({ pageName, title });
}

const homeLines = [
  "# OpenTrade Registry Wiki",
  "",
  "This wiki is generated from the repository's canonical `/docs` directory. Propose corrections in the repository so the next generated mirror remains reproducible.",
  "",
  "## Documentation",
  "",
  ...pages.map((page) => `- [${page.title}](${page.pageName})`),
  "",
  "Repository: [dannyward630/opentrade-registry](https://github.com/dannyward630/opentrade-registry)",
  "",
];
await writeFile(join(outputRoot, "Home.md"), homeLines.join("\n"), "utf8");
console.log(`Generated ${pages.length + 1} wiki pages in ${relative(root, outputRoot)}.`);

async function collectMarkdown(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectMarkdown(path)));
    else if (entry.isFile() && extname(entry.name) === ".md") files.push(path);
  }
  return files;
}

function rewriteRelativeLinks(markdown, repositoryPath) {
  return markdown.replace(/(!?\[[^\]]*\]\()([^)]+)(\))/g, (match, prefix, rawTarget, suffix) => {
    const target = rawTarget.trim().replace(/^<|>$/g, "");
    if (!target || target.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(target)) return match;
    const [pathAndQuery, anchor = ""] = target.split("#", 2);
    const cleanPath = pathAndQuery.split("?")[0];
    const resolved = toPosix(relative(root, resolve(root, dirname(repositoryPath), cleanPath)));
    const fragment = anchor ? `#${anchor}` : "";
    return `${prefix}${repositoryBlobUrl}/${resolved}${fragment}${suffix}`;
  });
}

function toPosix(path) {
  return path.split(sep).join("/");
}
