import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoiceBadge, PaymentBadge } from "../../features/payments/PaymentBadge";
import { BuildingDetailPage } from "./BuildingDetailPage";

const building = vi.hoisted(() => ({ overview: vi.fn() }));
vi.mock("../../features/buildings/api/building.api", () => ({
  buildingApi: building,
}));

describe("status and navigation", () => {
  beforeEach(() => building.overview.mockReset());

  it("shows distinct invoice and payment status labels", () => {
    render(<><InvoiceBadge status="PARTIALLY_PAID" /><PaymentBadge status="CONFIRMED" /></>);
    expect(screen.getByText("Thanh toán một phần")).toBeInTheDocument();
    expect(screen.getByText("Đã xác nhận")).toBeInTheDocument();
  });

  it("navigates from a building floor to its room list", async () => {
    building.overview.mockResolvedValue({
      building: { id: "building-1", name: "Tòa A", status: "ACTIVE", allowedGender: "MALE" },
      summary: { floorCount: 1, roomCount: 0, totalBeds: 0, occupiedBeds: 0, emptyBeds: 0, occupancyPercent: 0 },
      floors: [{ floor: 2, roomCount: 0, totalBeds: 0, occupiedBeds: 0, emptyBeds: 0, rooms: [] }],
    });
    render(
      <MemoryRouter initialEntries={["/admin/buildings/building-1"]}>
        <Routes>
          <Route path="/admin/buildings/:buildingId" element={<BuildingDetailPage />} />
          <Route path="/admin/buildings/:buildingId/floors/:floor/rooms" element={<p>Danh sách phòng tầng</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole("link", { name: /Tầng 2/ }));
    expect(screen.getByText("Danh sách phòng tầng")).toBeInTheDocument();
  });
});
