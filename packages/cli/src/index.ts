#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCE_RESEARCH_OUTCOMES } from "@opentrade-registry/core";
import { listSources, showSource, showSourceCoverage, showSourceReadiness, type SourceListOptions } from "./commands/sources.js";
import { syncSource } from "./commands/sync.js";
import { validateSources } from "./commands/validate.js";
import { verifyLicense } from "./commands/verify.js";

const EXIT_GENERAL_ERROR = 1;
const EXIT_INVALID_INPUT = 2;
const SOURCE_TYPES = ["bulk_csv", "bulk_xlsx", "bulk_json", "api", "html_lookup", "playwright_portal", "manual_public_records_file"] as const;
const ADAPTER_MATURITIES = ["registry_only", "fixture_adapter", "local_file_adapter", "network_opt_in", "production_ready", "blocked", "deprecated"] as const;
const ADAPTER_STATUSES = ["planned", "implemented", "experimental", "blocked", "deprecated"] as const;

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
      await listSources(rootDir, {
        json,
        state: stringFlag(parsed, "state"),
        maturity: enumFlag(parsed, "maturity", ADAPTER_MATURITIES),
        status: enumFlag(parsed, "status", ADAPTER_STATUSES),
        sourceType: enumFlag(parsed, "source-type", SOURCE_TYPES),
        qualityLevel: numberFlag(parsed, "quality-level"),
        researchOutcome: enumFlag(parsed, "research-outcome", SOURCE_RESEARCH_OUTCOMES),
        implemented: parsed.flags.implemented === true,
        registryOnly: parsed.flags["registry-only"] === true,
        bulkCandidates: parsed.flags["bulk-candidates"] === true,
      } satisfies SourceListOptions);
      return;
    }

    if (subcommand === "show" && maybeId) {
      await showSource(rootDir, maybeId, { json });
      return;
    }

    if (subcommand === "readiness") {
      await showSourceReadiness(rootDir, { json });
      return;
    }

    if (subcommand === "coverage") {
      await showSourceCoverage(rootDir, { json });
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
      cache: stringFlag(parsed, "cache"),
      format: stringFlag(parsed, "format"),
      url: stringFlag(parsed, "url"),
      allowNetwork: parsed.flags["allow-network"] === true,
      sourceLastModifiedAt: stringFlag(parsed, "source-last-modified"),
      json,
      strict: parsed.flags.strict === true,
      resumable: parsed.flags.resumable === true,
      checkpointInterval: numberFlag(parsed, "checkpoint-interval"),
      resumeFromRunId: stringFlag(parsed, "resume-run"),
    });
    return;
  }

  if (command === "verify") {
    await verifyLicense({
      rootDir,
      sourceId: stringFlag(parsed, "source"),
      file: stringFlag(parsed, "file"),
      cache: stringFlag(parsed, "cache"),
      url: stringFlag(parsed, "url"),
      allowNetwork: parsed.flags["allow-network"] === true,
      sourceLastModifiedAt: stringFlag(parsed, "source-last-modified"),
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

function numberFlag(parsed: ParsedArgs, key: string): number | undefined {
  const value = stringFlag(parsed, key);
  if (value === undefined) {
    return undefined;
  }

  const parsedValue = Number(value);
  if (Number.isNaN(parsedValue)) {
    throw Object.assign(new Error(`Invalid numeric value for --${key}: ${value}`), { exitCode: EXIT_INVALID_INPUT });
  }

  return parsedValue;
}

function enumFlag<const T extends readonly string[]>(parsed: ParsedArgs, key: string, allowed: T): T[number] | undefined {
  const value = stringFlag(parsed, key);
  if (value === undefined) {
    return undefined;
  }

  if (!allowed.includes(value)) {
    throw Object.assign(new Error(`Invalid value for --${key}: ${value}. Expected one of: ${allowed.join(", ")}`), { exitCode: EXIT_INVALID_INPUT });
  }

  return value;
}

function findProjectRoot(): string {
  const moduleDirectory = resolve(dirname(fileURLToPath(import.meta.url)));
  if (existsSync(join(moduleDirectory, "registry", "sources"))) {
    return moduleDirectory;
  }

  let current = moduleDirectory;
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

Work with registered public sources, supported local files, and explicit opt-in URL sync or verification.
Default commands do not contact agency sites. Network sync and verification require --allow-network.

Commands:
  opentrade sources list [--json]
  opentrade sources list [--state CA] [--maturity network_opt_in] [--status implemented] [--source-type bulk_csv] [--quality-level 4] [--research-outcome network_opt_in]
  opentrade sources list [--implemented | --registry-only | --bulk-candidates] [--json]
  opentrade sources show <sourceId> [--json]
  opentrade sources readiness [--json]
  opentrade sources coverage [--json]
  opentrade sources validate [--json]
  opentrade sync <sourceId> --file <path> [--out <path>] [--cache <path>] [--format jsonl|csv] [--json] [--strict]
  opentrade sync <sourceId> --file <path> --cache <path> --resumable [--checkpoint-interval <records>] [--json]
  opentrade sync <sourceId> --file <path> --cache <path> --resume-run <importRunId> [--checkpoint-interval <records>] [--json]
  opentrade sync <sourceId> --url <sourceUrl> --allow-network --out <path> [--format jsonl|csv] [--json] [--strict]
  opentrade verify --source <sourceId> --file <path> --license <licenseNumber> [--json]
  opentrade verify --source <sourceId> --cache <path> --license <licenseNumber> [--json]
  opentrade verify --source <sourceId> --url <sourceUrl> --allow-network --license <licenseNumber> [--json]

Use "sources show" before syncing or verifying a source to review coverage, caveats, adapter maturity, and data-use notes.
`);
}

main().catch((error) => {
  const exitCode = typeof error?.exitCode === "number" ? error.exitCode : EXIT_GENERAL_ERROR;
  if (!error?.alreadyReported) {
    console.error(error instanceof Error ? error.message : String(error));
  }
  process.exitCode = exitCode;
});
