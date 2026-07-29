import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TimeSlots from "../TimeSlots";

const slots = ["09:00", "09:30", "10:00", "10:30"];

describe("TimeSlots", () => {
  it("renders all time slots", () => {
    render(<TimeSlots selectedTime={null} onSelect={() => {}} disabledSlots={[]} timeSlots={slots} />);
    slots.forEach((s) => expect(screen.getByText(s)).toBeTruthy());
  });

  it("shows empty message when no slots", () => {
    render(<TimeSlots selectedTime={null} onSelect={() => {}} disabledSlots={[]} timeSlots={[]} />);
    expect(screen.getByText(/No hay horarios/)).toBeTruthy();
  });

  it("calls onSelect when clicking an enabled slot", () => {
    const onSelect = vi.fn();
    render(<TimeSlots selectedTime={null} onSelect={onSelect} disabledSlots={[]} timeSlots={slots} />);
    fireEvent.click(screen.getByText("09:00"));
    expect(onSelect).toHaveBeenCalledWith("09:00");
  });

  it("does not call onSelect for disabled slots", () => {
    const onSelect = vi.fn();
    render(<TimeSlots selectedTime={null} onSelect={onSelect} disabledSlots={["09:30"]} timeSlots={slots} />);
    fireEvent.click(screen.getByText("09:30"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("highlights selected slot", () => {
    render(<TimeSlots selectedTime="10:00" onSelect={() => {}} disabledSlots={[]} timeSlots={slots} />);
    const selectedBtn = screen.getByText("10:00");
    expect(selectedBtn.className).toContain("bg-amber-500");
  });
});
