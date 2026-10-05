import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute, RoleRoute } from "./guards";

const auth = vi.hoisted(() => ({
  value: { isInitializing: false, isAuthenticated: false, user: null as null | { role: string } },
}));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => auth.value }));

describe("route authorization", () => {
  beforeEach(() => {
    auth.value = { isInitializing: false, isAuthenticated: false, user: null };
  });

  it("redirects an unauthenticated visitor to login", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/login" element={<p>Đăng nhập</p>} />
          <Route path="/admin" element={<ProtectedRoute><p>Quản trị</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Đăng nhập")).toBeInTheDocument();
  });

  it("rejects a signed-in student from an admin route", () => {
    auth.value = {
      isInitializing: false,
      isAuthenticated: true,
      user: { role: "STUDENT" },
    };
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/unauthorized" element={<p>Không có quyền</p>} />
          <Route path="/admin" element={<RoleRoute role="ADMIN"><p>Quản trị</p></RoleRoute>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Không có quyền")).toBeInTheDocument();
  });
});
