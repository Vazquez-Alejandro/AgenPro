import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit } from "../rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows first request", () => {
    const result = checkRateLimit("test-key", 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("tracks multiple requests", () => {
    const key = "multi-key";
    checkRateLimit(key, 5, 60000);
    checkRateLimit(key, 5, 60000);
    const result = checkRateLimit(key, 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks when limit reached", () => {
    const key = "block-key";
    for (let i = 0; i < 3; i++) checkRateLimit(key, 3, 60000);
    const result = checkRateLimit(key, 3, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after window expires", () => {
    const key = "expire-key";
    checkRateLimit(key, 2, 1000);
    checkRateLimit(key, 2, 1000);
    vi.advanceTimersByTime(1100);
    const result = checkRateLimit(key, 2, 1000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("uses separate counters per key", () => {
    const r1 = checkRateLimit("key-a", 1, 60000);
    const r2 = checkRateLimit("key-b", 1, 60000);
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    const r3 = checkRateLimit("key-a", 1, 60000);
    expect(r3.allowed).toBe(false);
  });
});
