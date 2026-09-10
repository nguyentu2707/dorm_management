import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { Modal } from "../../components/ui/Modal";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/States";
import { Pagination } from "../../components/ui/Pagination";
import { studentRegistryApi, type RegistryInput } from "../../features/student-registry/api/student-registry.api";
import { normalizeApiError } from "../../services/api-client";
import type { Paginated, StudentRegistryRecord } from "../../types/api";

export function AdminStudentRegistryPage() {
  const [data, setData] = useState<Paginated<StudentRegistryRecord> | null>(null);
  const [page, setPage] = useState(1), [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<StudentRegistryRecord | null | undefined>();
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [formError, setFormError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await studentRegistryApi.list({ page, limit: 20, search: search || undefined, status: status || undefined })); }
    catch (e) { setError(normalizeApiError(e).message); }
    finally { setLoading(false); }
  }, [page, search, status]);
  useEffect(() => { void load(); }, [load]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setFormError("");
    const raw = Object.fromEntries(new FormData(event.currentTarget));
    const input: RegistryInput = {
      studentCode: String(raw.studentCode), fullName: String(raw.fullName),
      email: String(raw.email), gender: raw.gender as RegistryInput["gender"],
      ...(raw.dateOfBirth ? { dateOfBirth: String(raw.dateOfBirth) } : {}),
    };
    try {
      if (editing) await studentRegistryApi.update(editing.id, input);
      else await studentRegistryApi.create(input);
      setEditing(undefined); await load();
    } catch (e) { setFormError(normalizeApiError(e).message); }
    finally { setBusy(false); }
  }
  async function toggle(item: StudentRegistryRecord) {
    setBusy(true);
    try { await studentRegistryApi.status(item.id, item.status === "DISABLED" ? "AVAILABLE" : "DISABLED"); await load(); }
    catch (e) { setError(normalizeApiError(e).message); }
    finally { setBusy(false); }
  }
  return <>
    <PageHeader title="Danh sách xác minh sinh viên" description="MSSV phải có ở đây trước khi sinh viên đăng ký tài khoản." action={<button className="btn-primary" onClick={() => setEditing(null)}>Thêm sinh viên</button>} />
    <div className="card mb-5 grid gap-3 md:grid-cols-2">
      <input className="field" placeholder="Tìm MSSV, họ tên hoặc email" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
      <select className="field" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
        <option value="">Tất cả trạng thái</option><option value="AVAILABLE">Có thể đăng ký</option><option value="CLAIMED">Đã đăng ký</option><option value="DISABLED">Đã vô hiệu hóa</option>
      </select>
    </div>
    {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} /> : !data?.items.length ? <div className="card"><EmptyState /></div> : <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">MSSV</th><th className="p-3">Họ tên</th><th className="p-3">Email</th><th className="p-3">Giới tính</th><th className="p-3">Trạng thái</th><th className="p-3 text-right">Thao tác</th></tr></thead>
      <tbody>{data.items.map((item) => <tr className="border-b last:border-0" key={item.id}><td className="p-3 font-semibold">{item.studentCode}</td><td className="p-3">{item.fullName}</td><td className="p-3">{item.email ?? "—"}</td><td className="p-3">{item.gender ?? "—"}</td><td className="p-3">{item.status}</td><td className="p-3"><div className="flex justify-end gap-2">{item.status !== "CLAIMED" && <><button className="btn-secondary" onClick={() => setEditing(item)}>Sửa</button><button className="btn-secondary" disabled={busy} onClick={() => void toggle(item)}>{item.status === "DISABLED" ? "Bật" : "Tắt"}</button></>}</div></td></tr>)}</tbody></table>
      <Pagination meta={data.pagination} onChange={setPage} />
    </div>}
    <Modal open={editing !== undefined} title={editing ? "Sửa hồ sơ xác minh" : "Thêm sinh viên"} onClose={() => setEditing(undefined)}>
      <form className="space-y-4" onSubmit={submit}>
        <label><span className="label">MSSV</span><input className="field" name="studentCode" required defaultValue={editing?.studentCode} /></label>
        <label><span className="label">Họ tên</span><input className="field" name="fullName" required defaultValue={editing?.fullName} /></label>
        <label><span className="label">Email</span><input className="field" name="email" type="email" required defaultValue={editing?.email} /></label>
        <label><span className="label">Giới tính</span><select className="field" name="gender" required defaultValue={editing?.gender}><option value="">Chọn giới tính</option><option value="MALE">Nam</option><option value="FEMALE">Nữ</option><option value="OTHER">Khác</option></select></label>
        <label><span className="label">Ngày sinh (tùy chọn)</span><input className="field" name="dateOfBirth" type="date" defaultValue={editing?.dateOfBirth?.slice(0, 10)} /></label>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setEditing(undefined)}>Hủy</button><button className="btn-primary" disabled={busy}>{busy ? "Đang lưu..." : "Lưu"}</button></div>
      </form>
    </Modal>
  </>;
}
