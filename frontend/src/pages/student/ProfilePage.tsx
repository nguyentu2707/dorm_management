import { zodResolver } from "@hookform/resolvers/zod";
import {
  IdCard,
  KeyRound,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { PageHeader } from "../../components/common/PageHeader";
import { InlineError, LoadingState } from "../../components/ui/States";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { contractApi } from "../../features/contracts/api/contract.api";
import { profileApi } from "../../features/profile/api/profile.api";
import {
  profileSchema,
  type ProfileForm,
} from "../../features/profile/schemas/profile.schema";
import { studentFacilityApi } from "../../features/student-facilities/api/student-facility.api";
import { normalizeApiError } from "../../services/api-client";
import type { Contract, StudentProfile, StudentRoom } from "../../types/api";
import { formatDate } from "../../utils/date";

export function StudentProfilePage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [room, setRoom] = useState<StudentRoom | null>(null);
  const [tab, setTab] = useState<"profile" | "password">("profile");
  const [message, setMessage] = useState("");
  const [apiError, setApiError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    Promise.all([profileApi.get(), contractApi.active()])
      .then(async ([data, active]) => {
        setProfile(data);
        setContract(active);
        reset({
          fullName: data.fullName,
          dob: data.dob?.slice(0, 10) ?? "",
          gender: data.gender,
          email: data.email ?? "",
          phone: data.phone ?? "",
          permanentAddress: data.permanentAddress ?? "",
          emergencyContactName: data.emergencyContactName ?? "",
          emergencyContactPhone: data.emergencyContactPhone ?? "",
        });
        if (active) setRoom(await studentFacilityApi.room(active.roomId));
      })
      .catch((error) => setApiError(normalizeApiError(error).message));
  }, [reset]);

  if (!profile) return <LoadingState />;
  const bedNumber = room?.beds?.find(
    (bed) => bed.id === contract?.bedId,
  )?.bedNumber;
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
        description="Quản lý thông tin cá nhân và bảo mật tài khoản."
      />
      <div className="grid items-start gap-5 xl:grid-cols-[340px_1fr]">
        <div className="space-y-5">
          <aside className="card text-center">
            <div className="mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-full border-2 border-brand-500 bg-slate-100 text-slate-500">
              {profile.avatarUrl ? (
                <img
                  className="h-full w-full object-cover"
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                />
              ) : (
                <UserRound size={58} />
              )}
            </div>
            <h2 className="mt-4 text-xl font-bold">{profile.fullName}</h2>
            <span className="mt-2 inline-block rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
              Sinh viên
            </span>
            <p className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-500">
              <IdCard size={15} /> {profile.mssv}
            </p>
            <p className="mt-1 flex items-center justify-center gap-2 text-sm text-slate-500">
              <Mail size={15} /> {profile.email || "Chưa cập nhật email"}
            </p>
          </aside>
          <aside className="card">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              Thông tin tài khoản
            </h3>
            <dl className="space-y-3 text-sm">
              <Info label="Ngày tạo" value={formatDate(profile.createdAt)} />
              <Info
                label="Cập nhật cuối"
                value={formatDate(profile.updatedAt)}
              />
              <Info
                label="Trạng thái"
                value={<StatusBadge status={profile.status ?? "ACTIVE"} />}
              />
              <Info
                label="Phòng ở"
                value={
                  room ? `${room.roomNumber} / G${bedNumber ?? "—"}` : "Chưa có"
                }
                accent
              />
              <Info
                label="Lầu"
                value={
                  room
                    ? `Lầu ${room.floor} · ${room.building?.name ?? "—"}`
                    : "—"
                }
              />
            </dl>
          </aside>
        </div>

        <section>
          <div className="flex border-b">
            <Tab active={tab === "profile"} onClick={() => setTab("profile")}>
              <UserRound size={17} /> Thông tin cá nhân
            </Tab>
            <Tab active={tab === "password"} onClick={() => setTab("password")}>
              <ShieldCheck size={17} /> Đổi mật khẩu
            </Tab>
          </div>
          <div className="card mt-5">
            {message && (
              <p className="mb-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                {message}
              </p>
            )}
            {apiError && (
              <p className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {apiError}
              </p>
            )}
            {tab === "profile" ? (
              <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}>
                <Field label="Họ và tên" error={errors.fullName?.message}>
                  <input className="field" {...register("fullName")} />
                </Field>
                <Field label="MSSV / Tên đăng nhập">
                  <input
                    className="field bg-slate-50"
                    value={`${profile.mssv} / ${profile.username}`}
                    readOnly
                  />
                </Field>
                <Field label="Ngày sinh">
                  <input className="field" type="date" {...register("dob")} />
                </Field>
                <Field label="Giới tính">
                  <select className="field" {...register("gender")}>
                    <option value="">Chưa cập nhật</option>
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </Field>
                <Field label="SĐT cá nhân" error={errors.phone?.message}>
                  <input className="field" {...register("phone")} />
                </Field>
                <Field
                  label="SĐT gia đình"
                  error={errors.emergencyContactPhone?.message}
                >
                  <input
                    className="field"
                    {...register("emergencyContactPhone")}
                  />
                </Field>
                <Field label="Email" error={errors.email?.message}>
                  <input
                    className="field"
                    type="email"
                    {...register("email")}
                  />
                </Field>
                <Field
                  label="Người liên hệ gia đình"
                  error={errors.emergencyContactName?.message}
                >
                  <input
                    className="field"
                    {...register("emergencyContactName")}
                  />
                </Field>
                <Field
                  label="Hộ khẩu / Quê quán"
                  error={errors.permanentAddress?.message}
                  wide
                >
                  <input className="field" {...register("permanentAddress")} />
                </Field>
                <div className="flex justify-end sm:col-span-2">
                  <button className="btn-primary" disabled={isSubmitting}>
                    <Save size={17} />{" "}
                    {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            ) : (
              <PasswordForm
                onSuccess={() => {
                  setMessage("Đổi mật khẩu thành công.");
                  setApiError("");
                }}
                onError={setApiError}
              />
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function PasswordForm({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: (value: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onError("");
    const form = new FormData(event.currentTarget),
      currentPassword = String(form.get("currentPassword")),
      newPassword = String(form.get("newPassword")),
      confirmPassword = String(form.get("confirmPassword"));
    if (newPassword !== confirmPassword)
      return onError("Mật khẩu xác nhận không khớp.");
    setBusy(true);
    try {
      await profileApi.changePassword({ currentPassword, newPassword });
      event.currentTarget.reset();
      onSuccess();
    } catch (error) {
      onError(normalizeApiError(error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="mx-auto max-w-xl space-y-5" onSubmit={submit}>
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <KeyRound className="text-brand-600" /> Thay đổi mật khẩu
      </h2>
      <Field label="Mật khẩu hiện tại">
        <input
          className="field"
          name="currentPassword"
          type="password"
          required
        />
      </Field>
      <Field label="Mật khẩu mới">
        <input
          className="field"
          name="newPassword"
          type="password"
          minLength={6}
          required
        />
      </Field>
      <Field label="Nhập lại mật khẩu mới">
        <input
          className="field"
          name="confirmPassword"
          type="password"
          minLength={6}
          required
        />
      </Field>
      <div className="flex justify-end">
        <button className="btn-primary" disabled={busy}>
          <ShieldCheck size={17} /> {busy ? "Đang cập nhật..." : "Đổi mật khẩu"}
        </button>
      </div>
    </form>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold ${active ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500"}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function Info({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className={accent ? "font-semibold text-brand-600" : "font-medium"}>
        {value || "—"}
      </dd>
    </div>
  );
}
function Field({
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
