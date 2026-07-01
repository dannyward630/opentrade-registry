import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import {
  recordApiDeveloperKeyCreatedResponseV2Schema,
  recordApiDeveloperKeyListResponseV2Schema,
  recordApiErrorResponseV2Schema,
  recordApiLicenseResponseV2Schema,
  recordApiSearchResponseV2Schema,
  recordApiSourceListResponseV2Schema,
  recordApiVerificationJobResponseV2Schema,
  recordApiVerificationResponseV2Schema,
} from "@opentrade-registry/core";

const outputPath = resolve("docs/openapi-v2.json");
const check = process.argv.includes("--check");
const schemas = {
  ErrorResponse: jsonSchema(recordApiErrorResponseV2Schema),
  LicenseResponse: jsonSchema(recordApiLicenseResponseV2Schema),
  SearchResponse: jsonSchema(recordApiSearchResponseV2Schema),
  SourceListResponse: jsonSchema(recordApiSourceListResponseV2Schema),
  VerificationResponse: jsonSchema(recordApiVerificationResponseV2Schema),
  VerificationJobResponse: jsonSchema(recordApiVerificationJobResponseV2Schema),
  DeveloperKeyListResponse: jsonSchema(recordApiDeveloperKeyListResponseV2Schema),
  DeveloperKeyCreatedResponse: jsonSchema(recordApiDeveloperKeyCreatedResponseV2Schema),
};

const document = {
  openapi: "3.1.0",
  info: {
    title: "OpenTrade Registry Record API",
    version: "2.0.0",
    description: "Versioned, source-cited license search and verification API. A no-match result applies only to the named source and checked time.",
  },
  servers: [{ url: "https://api.opentrade-registry.example", description: "Replace with the deployed API origin." }],
  paths: {
    "/api/v2/sources": { get: operation("List registered sources", "SourceListResponse") },
    "/api/v2/licenses/search": {
      get: {
        ...operation("Search publication-approved license records", "SearchResponse"),
        parameters: [
          query("license"), query("business"), query("state"), query("source"), query("status"), query("trade"), query("cursor"),
          { ...query("limit"), schema: { type: "integer", minimum: 1, maximum: 100, default: 25 } },
        ],
        security: [{ ApiKey: [] }, {}],
      },
    },
    "/api/v2/licenses/{id}": { get: { ...operation("Get one publication-approved record", "LicenseResponse"), parameters: [path("id")] } },
    "/api/v2/verifications": {
      post: {
        ...operation("Verify a license against one registered source", "VerificationResponse"),
        requestBody: jsonBody({
          type: "object",
          required: ["sourceId", "licenseNumber"],
          properties: { sourceId: { type: "string", minLength: 1 }, licenseNumber: { type: "string", minLength: 1 } },
          additionalProperties: false,
        }),
      },
    },
    "/api/v2/verifications/{jobId}": { get: { ...operation("Get verification job state", "VerificationJobResponse"), parameters: [path("jobId")] } },
    "/api/v2/developer/keys": {
      get: { ...operation("List developer API-key metadata", "DeveloperKeyListResponse"), security: [{ SupabaseBearer: [] }] },
      post: {
        ...operation("Create a developer API key", "DeveloperKeyCreatedResponse", 201),
        security: [{ SupabaseBearer: [] }],
        requestBody: jsonBody({
          type: "object", required: ["name"], properties: { name: { type: "string", minLength: 1, maxLength: 80 } }, additionalProperties: false,
        }),
      },
    },
    "/api/v2/developer/keys/{id}": {
      delete: {
        summary: "Revoke a developer API key",
        parameters: [path("id")],
        security: [{ SupabaseBearer: [] }],
        responses: { "204": { description: "Key revoked" }, ...errorResponses() },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKey: { type: "apiKey", in: "header", name: "X-API-Key" },
      SupabaseBearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas,
  },
};

const serialized = `${JSON.stringify(document, null, 2)}\n`;
if (check) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== serialized) {
    console.error("docs/openapi-v2.json is stale. Run corepack pnpm api:spec:generate.");
    process.exitCode = 1;
  }
} else {
  await writeFile(outputPath, serialized, "utf8");
  console.log("Wrote docs/openapi-v2.json.");
}

function jsonSchema(schema) {
  const output = z.toJSONSchema(schema, { target: "draft-2020-12", unrepresentable: "any" });
  delete output.$schema;
  return output;
}

function operation(summary, schemaName, successStatus = 200) {
  return {
    summary,
    responses: {
      [String(successStatus)]: { description: "Success", content: { "application/json": { schema: { $ref: `#/components/schemas/${schemaName}` } } } },
      ...errorResponses(),
    },
  };
}

function errorResponses() {
  const content = { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } };
  return { "400": { description: "Invalid request", content }, "401": { description: "Authentication failed", content }, "404": { description: "Not found", content }, "429": { description: "Rate or quota limit exceeded", content }, "500": { description: "Internal error", content } };
}

function query(name) { return { name, in: "query", required: false, schema: { type: "string" } }; }
function path(name) { return { name, in: "path", required: true, schema: { type: "string", minLength: 1 } }; }
function jsonBody(schema) { return { required: true, content: { "application/json": { schema } } }; }
