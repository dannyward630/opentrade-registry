import { runStoragePressureMonitor } from "./storage-pressure.js";

const shutdown = new AbortController();
process.once("SIGINT", () => shutdown.abort("SIGINT"));
process.once("SIGTERM", () => shutdown.abort("SIGTERM"));

await runStoragePressureMonitor({
  path: requiredEnvironment("OPENTRADE_STORAGE_MONITOR_PATH"),
  statusFilePath: requiredEnvironment("OPENTRADE_STORAGE_HEALTH_FILE"),
  warningFreePercent: readPercentage("OPENTRADE_DISK_WARN_FREE_PERCENT", 15),
  stopFreePercent: readPercentage("OPENTRADE_DISK_STOP_FREE_PERCENT", 10),
  intervalMs: readPositiveInteger("OPENTRADE_STORAGE_MONITOR_INTERVAL_MS", 30_000),
  signal: shutdown.signal,
  onStatus: (status) => console.log(JSON.stringify({ service: "storage-monitor", event: "storage_pressure_checked", ...status })),
  onError: (error) => console.error(JSON.stringify({ service: "storage-monitor", event: "storage_pressure_check_failed", message: error.message })),
});

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the storage monitor.`);
  return value;
}

function readPositiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function readPercentage(name: string, fallback: number): number {
  const configured = process.env[name];
  if (configured === undefined || configured.trim() === "") return fallback;
  const value = Number(configured);
  if (!Number.isFinite(value) || value <= 0 || value >= 100) throw new Error(`${name} must be greater than 0 and less than 100.`);
  return value;
}
