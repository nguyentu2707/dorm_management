import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
    location = useLocation(),
    [apiError, setApiError] = useState(""),
    [showPassword, setShowPassword] = useState(false);
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
    <div className="mx-auto w-full max-w-md">
      <div className="auth-kicker">
        <span className="auth-kicker-dot" /> Cổng thông tin nội trú
      </div>
      <h1 className="auth-title">Chào mừng trở lại</h1>
      <p className="auth-subtitle">
        Đăng nhập để tiếp tục quản lý hành trình nội trú của bạn.
      </p>
      {location.state?.registered && (
        <div className="auth-success" role="status">
          Tạo tài khoản thành công. Bạn có thể đăng nhập ngay.
        </div>
      )}
      {apiError && (
        <div className="auth-error" role="alert">
          {apiError}
        </div>
      )}
      <form className="mt-7 space-y-5" onSubmit={submit} noValidate>
        <label className="block">
          <span className="auth-label">Tên đăng nhập</span>
          <span className="auth-field-wrap">
            <UserRound className="auth-field-icon" size={18} />
            <input
              className="auth-field"
              autoComplete="username"
              placeholder="Nhập tên đăng nhập"
              {...register("username")}
            />
          </span>
          <InlineError message={errors.username?.message} />
        </label>
        <label className="block">
          <span className="auth-label">Mật khẩu</span>
          <span className="auth-field-wrap">
            <LockKeyhole className="auth-field-icon" size={18} />
            <input
              className="auth-field pr-12"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
              {...register("password")}
            />
            <button
              className="auth-password-toggle"
              type="button"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
          <InlineError message={errors.password?.message} />
        </label>
        <button className="auth-submit group" disabled={isSubmitting}>
          <span>{isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}</span>
          <ArrowRight
            className="transition-transform group-hover:translate-x-1"
            size={18}
          />
        </button>
      </form>
      <div className="auth-divider">
        <span>hoặc</span>
      </div>
      <p className="text-center text-sm text-white/60">
        Chưa có tài khoản?{" "}
        <Link className="auth-link" to="/register">
          Đăng ký sinh viên
        </Link>
      </p>
    </div>
  );
}
