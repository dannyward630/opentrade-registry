import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const builtCliPath = join(process.cwd(), "packages", "cli", "dist", "index.js");
const sourceCliPath = join(process.cwd(), "packages", "cli", "src", "index.ts");
const tsxPath = require.resolve("tsx/cli");

export function createCliInvocation(args: string[]): { command: string; args: string[] } {
  if (process.env.OPENTRADE_TEST_COMPILED_CLI === "1") {
    if (!existsSync(builtCliPath)) {
      throw new Error(`Compiled CLI test mode requires ${builtCliPath}. Run the workspace build first.`);
    }
    return { command: process.execPath, args: [builtCliPath, ...args] };
  }

  return { command: process.execPath, args: [tsxPath, sourceCliPath, "--", ...args] };
}
