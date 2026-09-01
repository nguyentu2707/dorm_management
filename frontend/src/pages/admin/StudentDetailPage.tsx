import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { ErrorState, LoadingState } from "../../components/ui/States";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { adminStudentApi } from "../../features/students/api/student.api";
import { normalizeApiError } from "../../services/api-client";
import type { AdminStudent } from "../../types/api";

export function AdminStudentDetailPage() {
  const { id = "" } = useParams();
  const [student, setStudent] = useState<AdminStudent | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStudent(await adminStudentApi.get(id));
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error || !student)
    return (
      <ErrorState
        message={error || "Không tìm thấy sinh viên"}
        onRetry={load}
      />
    );
  const fields = [
    ["MSSV", student.mssv],
    ["Họ tên", student.fullName],
    ["Email", student.email],
    ["Số điện thoại", student.phone],
    ["Lớp", student.className],
    ["Khoa", student.faculty],
    ["Giới tính", student.gender],
    ["CCCD", student.cccd],
    ["Địa chỉ", student.permanentAddress],
    ["Liên hệ khẩn cấp", student.emergencyContactPhone],
  ];

  return (
    <>
      <PageHeader title="Chi tiết sinh viên" description="Hồ sơ chỉ đọc" />

      <div className="card">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            {student.currentContractStatus ? (
              <StatusBadge status={student.currentContractStatus} />
            ) : (
              <span className="text-sm text-slate-500">Chưa có hợp đồng</span>
            )}
          </div>

          {student.currentContractId && (
            <Link
              className="btn-primary"
              to={`/admin/contracts/${student.currentContractId}`}
            >
              Xem hợp đồng hiện tại
            </Link>
          )}
        </div>

        <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase text-slate-500">
                {label}
              </dt>
              <dd className="mt-1">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
