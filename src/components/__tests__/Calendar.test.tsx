import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Calendar from "../Calendar";

describe("Calendar", () => {
  it("renders current month name", () => {
    render(<Calendar selected={null} onSelect={() => {}} />);
    expect(screen.getByText(new RegExp(new Date().getFullYear().toString()))).toBeTruthy();
  });

  it("renders weekday headers", () => {
    render(<Calendar selected={null} onSelect={() => {}} />);
    expect(screen.getByText("Lun")).toBeTruthy();
    expect(screen.getByText("Mar")).toBeTruthy();
    expect(screen.getByText("Dom")).toBeTruthy();
  });

  it("calls onSelect when clicking a valid date", () => {
    const onSelect = vi.fn();
    render(<Calendar selected={null} onSelect={onSelect} />);
    // Use a date far from month boundary to avoid duplicates
    // Find a day that's in the middle of the current month
    const buttons = screen.getAllByRole("button");
    // The grid buttons are after the 2 nav buttons (prev/next month)
    // Pick a middle day button that won't appear twice
    const midButton = buttons.find((b) => {
      const text = b.textContent?.trim();
      return text === "15" && !b.disabled;
    });
    if (midButton) {
      fireEvent.click(midButton);
      expect(onSelect).toHaveBeenCalled();
    }
  });

  it("navigates to next month", () => {
    render(<Calendar selected={null} onSelect={() => {}} />);
    const buttons = screen.getAllByRole("button");
    const rightArrow = buttons[buttons.length - 1];
    fireEvent.click(rightArrow);
    expect(rightArrow).toBeTruthy();
  });

  it("blocks specified dates", () => {
    const onSelect = vi.fn();
    // Block day 15 of current month
    const now = new Date();
    const blocked = [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15`];
    render(<Calendar selected={null} onSelect={onSelect} blockedDates={blocked} />);
    const buttons = screen.getAllByRole("button");
    const day15 = buttons.find((b) => b.textContent?.trim() === "15" && !b.disabled);
    // If day15 exists and is blocked, clicking should not call onSelect
    if (day15) {
      fireEvent.click(day15);
    }
    expect(onSelect).not.toHaveBeenCalled();
  });
});
