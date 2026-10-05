import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RegisterPage } from "./RegisterPage";

const registerUser = vi.hoisted(() => vi.fn());
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ register: registerUser }),
}));

describe("register error state", () => {
  it("maps a registry business error to the MSSV field", async () => {
    registerUser.mockRejectedValueOnce({
      code: "STUDENT_NOT_IN_REGISTRY",
      message: "Không thể đăng ký",
    });
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Tên đăng nhập"), "student1");
    await user.type(screen.getByLabelText("Mật khẩu"), "Secret123!");
    await user.type(screen.getByLabelText("Mã số sinh viên"), "SV001");
    await user.type(screen.getByLabelText("Email xác minh"), "student@example.test");
    await user.type(screen.getByLabelText("Xác nhận mật khẩu"), "Secret123!");
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    expect(await screen.findByText("MSSV không có trong danh sách xác minh")).toBeInTheDocument();
  });
});
