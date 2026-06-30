import { describe, expect, it, vi } from "vitest";
import { createFixedWindowRateLimiter } from "../services/record-api/src/rate-limit.js";

describe("fixed-window anonymous rate limiter", () => {
  it("limits each client independently and resets after the window", () => {
    const now = vi.fn(() => 1_000);
    const limiter = createFixedWindowRateLimiter({ limit: 2, windowMs: 1_000, now });
    expect(limiter.allow("client-a")).toMatchObject({ allowed: true, remaining: 1 });
    expect(limiter.allow("client-a")).toMatchObject({ allowed: true, remaining: 0 });
    expect(limiter.allow("client-a")).toMatchObject({ allowed: false, remaining: 0, resetAt: 2_000 });
    expect(limiter.allow("client-b")).toMatchObject({ allowed: true, remaining: 1 });
    now.mockReturnValue(2_001);
    expect(limiter.allow("client-a")).toMatchObject({ allowed: true, remaining: 1 });
  });

  it("rejects unsafe configuration", () => {
    expect(() => createFixedWindowRateLimiter({ limit: 0, windowMs: 1_000 })).toThrow(/limit/i);
    expect(() => createFixedWindowRateLimiter({ limit: 1, windowMs: 0 })).toThrow(/window/i);
  });
});
