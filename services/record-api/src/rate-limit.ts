import type { AnonymousRateLimiter } from "./index.js";

type WindowState = { count: number; resetAt: number };

export function createFixedWindowRateLimiter(options: {
  limit: number;
  windowMs: number;
  maxClients?: number;
  now?: () => number;
}): AnonymousRateLimiter {
  if (!Number.isSafeInteger(options.limit) || options.limit < 1) throw new Error("Rate limit must be a positive integer.");
  if (!Number.isSafeInteger(options.windowMs) || options.windowMs < 1) throw new Error("Rate limit window must be a positive integer.");
  const maxClients = options.maxClients ?? 100_000;
  if (!Number.isSafeInteger(maxClients) || maxClients < 1) throw new Error("maxClients must be a positive integer.");
  const now = options.now ?? Date.now;
  const windows = new Map<string, WindowState>();

  return {
    allow(clientId) {
      const currentTime = now();
      let state = windows.get(clientId);
      if (!state || state.resetAt <= currentTime) {
        if (!state && windows.size >= maxClients) pruneExpired(windows, currentTime);
        if (!state && windows.size >= maxClients) {
          return { allowed: false, remaining: 0, resetAt: currentTime + options.windowMs };
        }
        state = { count: 0, resetAt: currentTime + options.windowMs };
        windows.set(clientId, state);
      }
      if (state.count >= options.limit) return { allowed: false, remaining: 0, resetAt: state.resetAt };
      state.count += 1;
      return { allowed: true, remaining: options.limit - state.count, resetAt: state.resetAt };
    },
  };
}

function pruneExpired(windows: Map<string, WindowState>, currentTime: number): void {
  for (const [clientId, state] of windows) {
    if (state.resetAt <= currentTime) windows.delete(clientId);
  }
}
