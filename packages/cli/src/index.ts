#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { listSources, showSource } from "./commands/sources.js";
import { syncSource } from "./commands/sync.js";
import { validateSources } from "./commands/validate.js";
import { verifyLicense } from "./commands/verify.js";

const EXIT_GENERAL_ERROR = 1;
const EXIT_INVALID_INPUT = 2;

type ParsedArgs = {
  positional: string[];
  flags: Record<string, string | boolean>;
};

async function main() {
  const rootDir = findProjectRoot();
  const rawArgs = process.argv.slice(2);
  const parsed = parseArgs(rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs);
  const [command, subcommand, maybeId] = parsed.positional;
  const json = parsed.flags.json === true;

  if (!command || command === "help" || command === "--help") {
    printHelp();
    return;
  }

  if (command === "sources") {
    if (subcommand === "list") {
      await listSources(rootDir, { json });
      return;
    }

    if (subcommand === "show" && maybeId) {
      await showSource(rootDir, maybeId, { json });
      return;
    }

    if (subcommand === "validate") {
      await validateSources(rootDir, { json });
      return;
    }
  }

  if (command === "sync" && subcommand) {
    await syncSource({
      rootDir,
      sourceId: subcommand,
      file: stringFlag(parsed, "file"),
      out: stringFlag(parsed, "out"),
      format: stringFlag(parsed, "format"),
      url: stringFlag(parsed, "url"),
      allowNetwork: parsed.flags["allow-network"] === true,
      sourceLastModifiedAt: stringFlag(parsed, "source-last-modified"),
      json,
      strict: parsed.flags.strict === true,
    });
    return;
  }

  if (command === "verify") {
    await verifyLicense({
      rootDir,
      sourceId: stringFlag(parsed, "source"),
      file: stringFlag(parsed, "file"),
      license: stringFlag(parsed, "license"),
      json,
    });
    return;
  }

  throw Object.assign(new Error(`Unknown command. Run opentrade help.`), { exitCode: EXIT_INVALID_INPUT });
}

function parseArgs(args: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) {
      continue;
    }

    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const flagName = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      flags[flagName] = true;
      continue;
    }

    flags[flagName] = next;
    index += 1;
  }

  return { positional, flags };
}

function stringFlag(parsed: ParsedArgs, key: string): string | undefined {
  const value = parsed.flags[key];
  return typeof value === "string" ? value : undefined;
}

function findProjectRoot(): string {
  let current = resolve(dirname(fileURLToPath(import.meta.url)));
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(join(current, "pnpm-workspace.yaml")) && existsSync(join(current, "registry", "sources"))) {
      return current;
    }
    current = dirname(current);
  }

  return process.cwd();
}

function printHelp() {
  console.log(`OpenTrade Registry CLI

Work with registered public sources, supported local files, and explicit opt-in URL sync.
Default commands do not contact agency sites. Network sync requires --allow-network.

Commands:
  opentrade sources list [--json]
  opentrade sources show <sourceId> [--json]
  opentrade sources validate [--json]
  opentrade sync <sourceId> --file <path> --out <path> [--format jsonl|csv] [--json] [--strict]
  opentrade sync <sourceId> --url <sourceUrl> --allow-network --out <path> [--format jsonl|csv] [--json] [--strict]
  opentrade verify --source <sourceId> --file <path> --license <licenseNumber> [--json]

Use "sources show" before syncing a source to review coverage, caveats, adapter maturity, and data-use notes.
`);
}

main().catch((error) => {
  const exitCode = typeof error?.exitCode === "number" ? error.exitCode : EXIT_GENERAL_ERROR;
  if (!error?.alreadyReported) {
    console.error(error instanceof Error ? error.message : String(error));
  }
  process.exitCode = exitCode;
});
