import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import {
  loginSchema,
  type LoginForm,
} from "../../features/auth/schemas/auth.schemas";
import { useAuth } from "../../hooks/useAuth";
import { normalizeApiError } from "../../services/api-client";
import { InlineError } from "../../components/ui/States";
export function LoginPage() {
  const { login } = useAuth(),
    navigate = useNavigate(),
    [apiError, setApiError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const submit = handleSubmit(async (values) => {
    setApiError("");
    try {
      const user = await login(values);
      navigate(
        user.role === "ADMIN"
          ? "/admin"
          : user.role === "STUDENT"
            ? "/student"
            : "/unauthorized",
        { replace: true },
      );
    } catch (e) {
      const error = normalizeApiError(e);
      setApiError(
        error.code === "INVALID_CREDENTIALS"
          ? "Tên đăng nhập hoặc mật khẩu không chính xác"
          : error.message,
      );
    }
  });
  return (
    <>
      <h1 className="text-3xl font-bold">Đăng nhập</h1>
      <p className="mt-2 text-slate-500">Chào mừng bạn quay lại hệ thống.</p>
      {apiError && (
        <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {apiError}
        </div>
      )}
      <form className="mt-7 space-y-5" onSubmit={submit}>
        <label className="block">
          <span className="label">Tên đăng nhập</span>
          <input
            className="field"
            autoComplete="username"
            {...register("username")}
          />
          <InlineError message={errors.username?.message} />
        </label>
        <label className="block">
          <span className="label">Mật khẩu</span>
          <input
            className="field"
            type="password"
            autoComplete="current-password"
            {...register("password")}
          />
          <InlineError message={errors.password?.message} />
        </label>
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Chưa có tài khoản?{" "}
        <Link className="font-semibold text-brand-600" to="/register">
          Đăng ký sinh viên
        </Link>
      </p>
    </>
  );
}
