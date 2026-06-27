import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const cliPath = join(process.cwd(), "packages", "cli", "src", "index.ts");
const require = createRequire(import.meta.url);
const tsxPath = require.resolve("tsx/cli");

const implementedVerificationCases = [
  {
    sourceId: "us.ak.commerce.construction_contractors",
    fixturePath: "packages/adapter-ak-commerce/fixtures/construction-contractors-sample.csv",
    missingLicense: "AKCOMM999999",
  },
  {
    sourceId: "us.az.roc.contractors",
    fixturePath: "packages/adapter-az-roc/fixtures/contractor-license-sample.csv",
    missingLicense: "AZROC999999",
  },
  {
    sourceId: "us.ca.cslb.contractors",
    fixturePath: "packages/adapter-ca-cslb/fixtures/contractors-master-sample.csv",
    missingLicense: "9999999",
  },
  {
    sourceId: "us.fl.dbpr.construction",
    fixturePath: "packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv",
    missingLicense: "CGC000000",
  },
  {
    sourceId: "us.il.idfpr.roofing_contractors",
    fixturePath: "packages/adapter-il-idfpr/fixtures/roofing-contractors-sample.csv",
    missingLicense: "ILROOF999999",
  },
  {
    sourceId: "us.in.pla.professional_licenses",
    fixturePath: "packages/adapter-in-pla/fixtures/professional-licenses-sample.csv",
    missingLicense: "INPLA999999",
  },
  {
    sourceId: "us.mn.dli.licenses_registrations",
    fixturePath: "packages/adapter-mn-dli/fixtures/licenses-registrations-sample.csv",
    missingLicense: "MNDLI999999",
  },
  {
    sourceId: "us.or.ccb.active_licenses",
    fixturePath: "packages/adapter-or-ccb/fixtures/active-licenses-sample.csv",
    missingLicense: "ORCCB999",
  },
  {
    sourceId: "us.tx.tdlr.all_licenses",
    fixturePath: "packages/adapter-tx-tdlr/fixtures/all-licenses-sample.csv",
    missingLicense: "TACLA999999",
  },
  {
    sourceId: "us.wa.lni.contractors",
    fixturePath: "packages/adapter-wa-lni/fixtures/contractor-license-sample.csv",
    missingLicense: "WALNI999999",
  },
] as const;

describe("adapter Level 4 verification semantics", () => {
  for (const verificationCase of implementedVerificationCases) {
    it(`${verificationCase.sourceId} reports neutral not_found semantics`, () => {
      const result = runCli(
        [
          "verify",
          "--source",
          verificationCase.sourceId,
          "--file",
          verificationCase.fixturePath,
          "--license",
          verificationCase.missingLicense,
          "--json",
        ],
        4,
      );
      const json = JSON.parse(result.stdout);

      expect(json.result).toBe("not_found");
      expect(json.message).toBe("No matching record was found in this source as of the checked time.");
      expect(json.reasons).toContainEqual({
        code: "no_match_in_source",
        message: "No matching record was found in this source as of the checked time.",
      });
      expect(json.matchedRecord).toBeUndefined();
      expect(json.candidateRecords).toBeUndefined();
    });
  }
});

function runCli(args: string[], expectedStatus = 0) {
  const result = spawnSync(process.execPath, [tsxPath, cliPath, "--", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  expect(result.status).toBe(expectedStatus);
  expect(result.stderr).toBe("");
  return result;
}
