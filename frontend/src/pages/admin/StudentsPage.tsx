import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { Pagination } from "../../components/ui/Pagination";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/ui/States";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { adminStudentApi } from "../../features/students/api/student.api";
import { normalizeApiError } from "../../services/api-client";
import type { AdminStudent, Paginated } from "../../types/api";

export function AdminStudentsPage() {
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState<Paginated<AdminStudent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const page = Number(params.get("page") ?? 1);
  const search = params.get("search") ?? "";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(
        await adminStudentApi.list({
          page,
          limit: 20,
          search: search || undefined,
        }),
      );
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Sinh viên"
        description="Danh sách hồ sơ sinh viên và trạng thái hợp đồng"
      />
      <form
        className="card mb-5 flex gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const value = String(
            new FormData(event.currentTarget).get("search") ?? "",
          );
          setParams(value ? { search: value } : {});
        }}
      >
        <input
          className="field"
          name="search"
          defaultValue={search}
          placeholder="Tìm theo MSSV, họ tên hoặc email"
        />
        <button className="btn-primary">Tìm kiếm</button>
      </form>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !result?.items.length ? (
        <div className="card">
          <EmptyState message="Không tìm thấy sinh viên" />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="p-3">MSSV</th>
                <th>Họ tên</th>
                <th>Lớp / Khoa</th>
                <th>Hợp đồng</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((student) => (
                <tr className="border-b" key={student.id}>
                  <td className="p-3 font-medium">{student.mssv}</td>
                  <td>{student.fullName}</td>
                  <td>
                    {student.className ?? "—"}
                    <br />
                    <span className="text-xs text-slate-500">
                      {student.faculty ?? "—"}
                    </span>
                  </td>
                  <td>
                    {student.currentContractStatus ? (
                      <StatusBadge status={student.currentContractStatus} />
                    ) : (
                      <span className="text-slate-500">Chưa có hợp đồng</span>
                    )}
                  </td>
                  <td>
                    <Link
                      className="text-brand-600"
                      to={`/admin/students/${student.id}`}
                    >
                      Xem
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            meta={result.pagination}
            onChange={(next) =>
              setParams({ ...(search ? { search } : {}), page: String(next) })
            }
          />
        </div>
      )}
    </>
  );
}
