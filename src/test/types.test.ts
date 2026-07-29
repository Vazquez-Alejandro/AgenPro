import { describe, it, expect } from "vitest";
import { DAY_NAMES, DEFAULT_FEATURES } from "@/types";

describe("DAY_NAMES", () => {
  it("should have 7 days", () => {
    expect(DAY_NAMES).toHaveLength(7);
  });

  it("should start with Domingo (Sunday)", () => {
    expect(DAY_NAMES[0]).toBe("Domingo");
  });

  it("should have all days in correct order", () => {
    expect(DAY_NAMES).toEqual([
      "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado",
    ]);
  });
});

describe("DEFAULT_FEATURES", () => {
  it("should have all feature flags as false", () => {
    expect(Object.values(DEFAULT_FEATURES).every((v) => v === false)).toBe(true);
  });

  it("should have expected feature keys", () => {
    const expectedKeys = [
      "blacklist",
      "cleaning_time",
      "mandatory_deposit",
      "no_show_tracking",
      "confirmation_button",
    ];
    expectedKeys.forEach((key) => {
      expect(DEFAULT_FEATURES).toHaveProperty(key);
    });
  });
});
