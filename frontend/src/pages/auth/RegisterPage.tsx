import { zodResolver } from "@hookform/resolvers/zod";
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
    [apiError, setApiError] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });
  const submit = handleSubmit(async (values) => {
    try {
      await registerUser(values);
      navigate("/login", { replace: true, state: { registered: true } });
    } catch (e) {
      const error = normalizeApiError(e);
      error.errors?.forEach((item) =>
        setError(item.field as keyof RegisterForm, { message: item.message }),
      );
      if (error.code === "USERNAME_ALREADY_EXISTS")
        setError("username", { message: "Tên đăng nhập đã tồn tại" });
      else if (error.code === "MSSV_ALREADY_EXISTS")
        setError("mssv", { message: "MSSV đã tồn tại" });
      else setApiError(error.message);
    }
  });
  return (
    <>
      <h1 className="text-3xl font-bold">Đăng ký sinh viên</h1>
      <p className="mt-2 text-slate-500">Tạo tài khoản để đăng ký chỗ ở.</p>
      {apiError && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">
          {apiError}
        </div>
      )}
      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        {[
          ["username", "Tên đăng nhập", "text"],
          ["password", "Mật khẩu", "password"],
          ["fullName", "Họ và tên", "text"],
          ["mssv", "Mã số sinh viên", "text"],
          ["email", "Email (không bắt buộc)", "email"],
        ].map(([name, label, type]) => (
          <label key={name} className={name === "email" ? "sm:col-span-2" : ""}>
            <span className="label">{label}</span>
            <input
              className="field"
              type={type}
              {...register(name as keyof RegisterForm)}
            />
            <InlineError
              message={errors[name as keyof RegisterForm]?.message}
            />
          </label>
        ))}
        <button className="btn-primary sm:col-span-2" disabled={isSubmitting}>
          {isSubmitting ? "Đang tạo..." : "Tạo tài khoản"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm">
        Đã có tài khoản?{" "}
        <Link className="font-semibold text-brand-600" to="/login">
          Đăng nhập
        </Link>
      </p>
    </>
  );
}
