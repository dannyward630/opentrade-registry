import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { OPENTRADE_V2_ROUTES } from "@opentrade-registry/core";

describe("v2 OpenAPI artifact", () => {
  it("documents every frozen route and response schema", async () => {
    const document = JSON.parse(await readFile(new URL("../docs/openapi-v2.json", import.meta.url), "utf8")) as {
      openapi: string;
      info: { version: string };
      paths: Record<string, unknown>;
      components: { schemas: Record<string, unknown> };
    };
    expect(document.openapi).toBe("3.1.0");
    expect(document.info.version).toBe("2.0.0");
    for (const route of Object.values(OPENTRADE_V2_ROUTES)) {
      expect(document.paths).toHaveProperty(route.replace(":id", "{id}").replace(":jobId", "{jobId}"));
    }
    expect(Object.keys(document.components.schemas)).toEqual(expect.arrayContaining([
      "ErrorResponse",
      "LicenseResponse",
      "SearchResponse",
      "SourceListResponse",
      "VerificationResponse",
      "VerificationJobResponse",
      "DeveloperKeyListResponse",
      "DeveloperKeyCreatedResponse",
    ]));
  });
});
