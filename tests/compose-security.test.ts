import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("self-hosted Compose security", () => {
  it("binds database and object storage only to loopback", async () => {
    const compose = await readFile(join(process.cwd(), "infra", "compose.yaml"), "utf8");
    expect(compose).toContain('"127.0.0.1:${POSTGRES_PORT:-5432}:5432"');
    expect(compose).toContain('"127.0.0.1:${MINIO_API_PORT:-9000}:9000"');
    expect(compose).toContain('"127.0.0.1:${MINIO_CONSOLE_PORT:-9001}:9001"');
    expect(compose).toContain('"127.0.0.1:${RECORD_API_PORT:-8787}:8787"');
    expect(compose).not.toMatch(/-\s*["']?(?:0\.0\.0\.0:)?(?:5432|9000|9001):/);
    expect(compose).toContain("internal: true");
  });

  it("does not commit deployment credentials", async () => {
    const environment = await readFile(join(process.cwd(), "infra", ".env.example"), "utf8");
    expect(environment).toContain("change-me-before-first-start");
    expect(environment).not.toMatch(/eyJ[a-zA-Z0-9_-]{20,}|sb_secret_|service_role/i);
  });
});
