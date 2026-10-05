import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  AtSign,
  BadgeCheck,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import {
  registerSchema,
  type RegisterForm,
} from "../../features/auth/schemas/auth.schemas";
import { useAuth } from "../../hooks/useAuth";
import { normalizeApiError } from "../../services/api-client";
import { InlineError } from "../../components/ui/States";
export function RegisterPage() {
  const { register: registerUser } = useAuth(),
    navigate = useNavigate(),
    [apiError, setApiError] = useState(""),
    [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });
  const submit = handleSubmit(async (values) => {
    try {
      const input = {
        username: values.username,
        password: values.password,
        mssv: values.mssv,
        email: values.email,
      };
      await registerUser(input);
      navigate("/login", { replace: true, state: { registered: true } });
    } catch (e) {
      const error = normalizeApiError(e);
      error.errors?.forEach((item) =>
        setError(item.field as keyof RegisterForm, { message: item.message }),
      );
      if (error.code === "USERNAME_ALREADY_EXISTS")
        setError("username", { message: "Tên đăng nhập đã tồn tại" });
      else if (
        [
          "STUDENT_REGISTRY_ALREADY_CLAIMED",
          "STUDENT_CODE_ALREADY_EXISTS",
        ].includes(error.code ?? "")
      )
        setError("mssv", { message: "MSSV đã được đăng ký" });
      else if (error.code === "STUDENT_NOT_IN_REGISTRY")
        setError("mssv", { message: "MSSV không có trong danh sách xác minh" });
      else if (error.code === "STUDENT_IDENTITY_MISMATCH")
        setError("email", { message: "Email không khớp với MSSV" });
      else setApiError(error.message);
    }
  });
  const fields = [
    {
      name: "username",
      label: "Tên đăng nhập",
      type: "text",
      icon: UserRound,
      placeholder: "Tối thiểu 4 ký tự",
      wide: false,
      password: false,
    },
    {
      name: "mssv",
      label: "Mã số sinh viên",
      type: "text",
      icon: GraduationCap,
      placeholder: "Ví dụ: SV2026001",
      wide: false,
      password: false,
    },
    {
      name: "email",
      label: "Email xác minh",
      type: "email",
      icon: AtSign,
      placeholder: "Email trong danh sách sinh viên",
      wide: true,
      password: false,
    },
    {
      name: "password",
      label: "Mật khẩu",
      type: showPassword ? "text" : "password",
      icon: LockKeyhole,
      placeholder: "Tối thiểu 6 ký tự",
      wide: false,
      password: true,
    },
    {
      name: "confirmPassword",
      label: "Xác nhận mật khẩu",
      type: showPassword ? "text" : "password",
      icon: BadgeCheck,
      placeholder: "Nhập lại mật khẩu",
      wide: false,
      password: true,
    },
  ] as const;
  return (
    <div className="w-full">
      <div className="auth-kicker">
        <span className="auth-kicker-dot" /> Dành cho sinh viên
      </div>
      <h1 className="auth-title">Tạo tài khoản mới</h1>
      <p className="auth-subtitle">
        Xác minh thông tin sinh viên để bắt đầu đăng ký chỗ ở.
      </p>
      {apiError && (
        <div className="auth-error" role="alert">
          {apiError}
        </div>
      )}
      <form
        className="mt-6 grid gap-4 sm:grid-cols-2"
        onSubmit={submit}
        noValidate
      >
        {fields.map(
          ({ name, label, type, icon: Icon, placeholder, ...field }) => (
            <label key={name} className={field.wide ? "sm:col-span-2" : ""}>
              <span className="auth-label">{label}</span>
              <span className="auth-field-wrap">
                <Icon className="auth-field-icon" size={18} />
                <input
                  className={`auth-field ${field.password ? "pr-12" : ""}`}
                  type={type}
                  placeholder={placeholder}
                  autoComplete={
                    name === "username"
                      ? "username"
                      : name === "email"
                        ? "email"
                        : name === "password"
                          ? "new-password"
                          : undefined
                  }
                  {...register(name as keyof RegisterForm)}
                />
                {field.password && (
                  <button
                    className="auth-password-toggle"
                    type="button"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                )}
              </span>
              <InlineError
                message={errors[name as keyof RegisterForm]?.message}
              />
            </label>
          ),
        )}
        <button
          className="auth-submit group sm:col-span-2"
          disabled={isSubmitting}
        >
          <span>{isSubmitting ? "Đang tạo..." : "Tạo tài khoản"}</span>
          <ArrowRight
            className="transition-transform group-hover:translate-x-1"
            size={18}
          />
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-white/60">
        Đã có tài khoản?{" "}
        <Link className="auth-link" to="/login">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
