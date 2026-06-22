import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { formatTimestamp, formatTimestampWithToday } from "./date";

const NOW = new Date("2026-05-11T14:30:00").getTime();

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

describe("formatTimestamp", () => {
  it("returns HH:mm for same-day timestamp", () => {
    const iso = new Date("2026-05-11T09:05:00").toISOString();
    expect(formatTimestamp(iso)).toMatch(/^\d{2}:\d{2}$/);
  });

  it("returns dd/MM HH:mm for other day", () => {
    const iso = new Date("2026-05-10T09:05:00").toISOString();
    expect(formatTimestamp(iso)).toMatch(/^\d{2}\/\d{2} \d{2}:\d{2}$/);
  });

  it("returns empty string for invalid input", () => {
    expect(formatTimestamp("not-a-date")).toBe("");
    expect(formatTimestamp("")).toBe("");
  });
});

describe("formatTimestampWithToday", () => {
  it("prefixes Today for same-day timestamp", () => {
    const iso = new Date("2026-05-11T09:05:00").toISOString();
    expect(formatTimestampWithToday(iso)).toMatch(/^Today \d{2}:\d{2}$/);
  });

  it("falls back to dd/MM for other day", () => {
    const iso = new Date("2026-05-09T09:05:00").toISOString();
    expect(formatTimestampWithToday(iso)).toMatch(/^\d{2}\/\d{2} \d{2}:\d{2}$/);
  });
});
