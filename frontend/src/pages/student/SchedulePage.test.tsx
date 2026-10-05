import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentSchedulePage } from "./SchedulePage";

const api = vi.hoisted(() => ({
  schedule: vi.fn(),
  saveSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
}));
vi.mock("../../features/recommendations/api/recommendation.api", () => ({
  recommendationApi: api,
}));

describe("schedule mutation", () => {
  beforeEach(() => {
    api.schedule.mockReset().mockResolvedValue(null);
    api.saveSchedule.mockReset();
    api.deleteSchedule.mockReset();
  });

  it("disables actions and prevents a duplicate save", async () => {
    let finish!: () => void;
    api.saveSchedule.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    render(<StudentSchedulePage />);
    const save = screen.getByRole("button", { name: "Lưu lịch" });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(api.saveSchedule).toHaveBeenCalledTimes(1);
    expect(save).toBeDisabled();
    await act(async () => finish());
    expect(await screen.findByText("Đã lưu lịch học.")).toBeInTheDocument();
  });
});
