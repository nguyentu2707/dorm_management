import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { PageHeader } from "../../components/common/PageHeader";
import { InlineError, LoadingState } from "../../components/ui/States";
import { profileApi } from "../../features/profile/api/profile.api";
import {
  profileSchema,
  type ProfileForm,
} from "../../features/profile/schemas/profile.schema";
import { normalizeApiError } from "../../services/api-client";
import type { StudentProfile } from "../../types/api";

export function StudentProfilePage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [message, setMessage] = useState("");
  const [apiError, setApiError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    profileApi.get().then((data) => {
      setProfile(data);
      reset({
        email: data.email ?? "",
        phone: data.phone ?? "",
        permanentAddress: data.permanentAddress ?? "",
        emergencyContactName: data.emergencyContactName ?? "",
        emergencyContactPhone: data.emergencyContactPhone ?? "",
      });
    });
  }, [reset]);

  if (!profile) return <LoadingState />;

  const submit = handleSubmit(async (values) => {
    setMessage("");
    setApiError("");
    try {
      const updated = await profileApi.update(values);
      setProfile(updated);
      setMessage("Hồ sơ đã được cập nhật thành công.");
    } catch (error) {
      setApiError(normalizeApiError(error).message);
    }
  });

  return (
    <>
      <PageHeader
        title="Hồ sơ cá nhân"
        description="MSSV và CCCD là thông tin định danh, không thể tự chỉnh sửa."
      />
      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <aside className="card h-fit">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-brand-50 text-2xl font-bold text-brand-600">
            {profile.fullName.charAt(0).toUpperCase()}
          </div>
          <h2 className="mt-4 text-xl font-bold">{profile.fullName}</h2>
          <p className="text-sm text-slate-500">{profile.mssv}</p>
          <dl className="mt-6 space-y-3 text-sm">
            <ProfileInfo label="Lớp" value={profile.className} />
            <ProfileInfo label="Khoa" value={profile.faculty} />
            <ProfileInfo label="Giới tính" value={profile.gender} />
            <ProfileInfo label="CCCD" value={profile.cccd} />
          </dl>
        </aside>
        <section className="card">
          <h2 className="text-lg font-bold">Thông tin liên hệ</h2>
          {message && (
            <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              {message}
            </div>
          )}
          {apiError && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {apiError}
            </div>
          )}
          <form className="mt-6 grid gap-5 sm:grid-cols-2" onSubmit={submit}>
            <ProfileField label="Email" error={errors.email?.message}>
              <input className="field" type="email" {...register("email")} />
            </ProfileField>
            <ProfileField label="Số điện thoại" error={errors.phone?.message}>
              <input className="field" {...register("phone")} />
            </ProfileField>
            <ProfileField
              label="Người liên hệ khẩn cấp"
              error={errors.emergencyContactName?.message}
            >
              <input className="field" {...register("emergencyContactName")} />
            </ProfileField>
            <ProfileField
              label="SĐT liên hệ khẩn cấp"
              error={errors.emergencyContactPhone?.message}
            >
              <input className="field" {...register("emergencyContactPhone")} />
            </ProfileField>
            <ProfileField
              label="Địa chỉ thường trú"
              error={errors.permanentAddress?.message}
              wide
            >
              <textarea
                className="field"
                rows={4}
                {...register("permanentAddress")}
              />
            </ProfileField>
            <div className="flex justify-end sm:col-span-2">
              <button className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}

function ProfileInfo({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-3 border-b pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
function ProfileField({
  label,
  error,
  wide,
  children,
}: {
  label: string;
  error?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="label">{label}</span>
      {children}
      <InlineError message={error} />
    </label>
  );
}
