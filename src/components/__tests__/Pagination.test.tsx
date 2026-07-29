import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Pagination from "../Pagination";

describe("Pagination", () => {
  it("renders nothing when totalPages <= 1", () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={() => {}} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows current page and total", () => {
    render(<Pagination page={2} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByText("2 / 5")).toBeTruthy();
  });

  it("calls onPageChange with page - 1 on previous click", () => {
    const onChange = vi.fn();
    render(<Pagination page={3} totalPages={5} onPageChange={onChange} />);
    const prevBtn = screen.getAllByRole("button")[0];
    fireEvent.click(prevBtn);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange with page + 1 on next click", () => {
    const onChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={onChange} />);
    const nextBtn = screen.getAllByRole("button")[1];
    fireEvent.click(nextBtn);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("disables previous on first page", () => {
    render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);
    const prevBtn = screen.getAllByRole("button")[0];
    expect(prevBtn).toBeDisabled();
  });

  it("disables next on last page", () => {
    render(<Pagination page={5} totalPages={5} onPageChange={() => {}} />);
    const nextBtn = screen.getAllByRole("button")[1];
    expect(nextBtn).toBeDisabled();
  });
});
