import { describe, it, expect } from "vitest";
import { generateTimeSlots, formatPrice } from "../utils";

describe("generateTimeSlots", () => {
  const base = { day_of_week: 1, start_time: "09:00", end_time: "12:00", slot_duration: 30, is_active: true };

  it("generates correct slots for 30min intervals", () => {
    const slots = generateTimeSlots(base);
    expect(slots).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]);
  });

  it("generates correct slots for 60min intervals", () => {
    const slots = generateTimeSlots({ ...base, slot_duration: 60 });
    expect(slots).toEqual(["09:00", "10:00", "11:00"]);
  });

  it("returns empty array when start equals end", () => {
    const slots = generateTimeSlots({ ...base, start_time: "10:00", end_time: "10:00" });
    expect(slots).toEqual([]);
  });

  it("handles non-round times", () => {
    // 09:15 + 30 = 09:45 <= 11:00, 09:45 + 30 = 10:15 <= 11:00, 10:15 + 30 = 10:45 <= 11:00, 10:45 + 30 = 11:15 > 11:00
    const slots = generateTimeSlots({ ...base, start_time: "09:15", end_time: "11:00", slot_duration: 30 });
    expect(slots).toEqual(["09:15", "09:45", "10:15"]);
  });

  it("excludes slot that would exceed end_time", () => {
    // 11:30 + 30 = 12:00 > 11:45, so 11:30 is excluded
    const slots = generateTimeSlots({ ...base, end_time: "11:45", slot_duration: 30 });
    expect(slots).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
  });
});

describe("formatPrice", () => {
  it("formats cents to ARS currency", () => {
    expect(formatPrice(120000)).toContain("1.200");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toContain("0");
  });

  it("formats small amounts", () => {
    // 5000 cents = $50.00
    const result = formatPrice(5000);
    expect(result).toContain("50");
  });
});
