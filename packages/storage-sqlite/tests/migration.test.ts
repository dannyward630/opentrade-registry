import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import initSqlJs from "sql.js";
import { describe, expect, it } from "vitest";
import { OpenTradeSqliteCache, SQLITE_SCHEMA_SQL, SQLITE_SCHEMA_VERSION } from "../src/index.js";

describe("SQLite migrations", () => {
  it("upgrades a version 1 cache without dropping records", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opentrade-sqlite-migration-"));
    const filePath = join(directory, "v1.sqlite");
    const require = createRequire(import.meta.url);
    const wasmDirectory = dirname(require.resolve("sql.js/dist/sql-wasm.js"));
    const SQL = await initSqlJs({ locateFile: (file) => resolve(wasmDirectory, file) });
    const database = new SQL.Database();
    const versionOneSchema = SQLITE_SCHEMA_SQL
      .replace("  retained_until text,\n", "")
      .replace("  redacted_at text,\n", "");
    database.run(versionOneSchema);
    database.run("create table opentrade_schema_version (version integer not null)");
    database.run("insert into opentrade_schema_version(version) values (1)");
    await writeFile(filePath, database.export());
    database.close();

    try {
      const cache = await OpenTradeSqliteCache.open({ filePath, create: false });
      expect(cache.schemaVersion).toBe(SQLITE_SCHEMA_VERSION);
      const columns = cache.database.exec("pragma table_info(opentrade_license_records)")[0].values.map((row) => row[1]);
      expect(columns).toContain("retained_until");
      expect(columns).toContain("redacted_at");
      await cache.close();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("upgrades an unversioned cache created from the pre-v1 exported schema", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opentrade-sqlite-unversioned-"));
    const filePath = join(directory, "unversioned.sqlite");
    const require = createRequire(import.meta.url);
    const wasmDirectory = dirname(require.resolve("sql.js/dist/sql-wasm.js"));
    const SQL = await initSqlJs({ locateFile: (file) => resolve(wasmDirectory, file) });
    const database = new SQL.Database();
    database.run(SQLITE_SCHEMA_SQL.replace("  retained_until text,\n", "").replace("  redacted_at text,\n", ""));
    await writeFile(filePath, database.export());
    database.close();

    try {
      const cache = await OpenTradeSqliteCache.open({ filePath, create: false });
      expect(cache.schemaVersion).toBe(SQLITE_SCHEMA_VERSION);
      const columns = cache.database.exec("pragma table_info(opentrade_license_records)")[0].values.map((row) => row[1]);
      expect(columns).toContain("retained_until");
      expect(columns).toContain("redacted_at");
      await cache.close();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
