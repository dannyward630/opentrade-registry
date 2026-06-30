import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("repository threat model", () => {
  it("documents the primary trust boundaries and severity calibration", async () => {
    const threatModel = await readFile(new URL("../docs/security-threat-model.md", import.meta.url), "utf8");
    for (const heading of [
      "# Security Threat Model",
      "## Overview",
      "## Threat Model, Trust Boundaries, and Assumptions",
      "## Attack Surface, Mitigations, and Attacker Stories",
      "## Severity Calibration",
    ]) expect(threatModel).toContain(heading);
    for (const boundary of ["Official source boundary", "Publication boundary", "Identity and API-key boundary", "Private infrastructure boundary", "Supply-chain boundary"]) {
      expect(threatModel).toContain(boundary);
    }
    for (const control of ["SSRF", "formula injection", "decompression", "PII", "CAPTCHA", "service-role"]) {
      expect(threatModel).toContain(control);
    }
  });
});
