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
import { equipmentApi } from "../../features/equipment/api/equipment.api";
import { normalizeApiError } from "../../services/api-client";
import { formatDate } from "../../utils/date";
import type { AdminEquipment, Paginated } from "../../types/api";
export function EquipmentPage() {
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState<Paginated<AdminEquipment> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const page = Number(params.get("page") ?? 1);
  const search = params.get("search") ?? "";
  const condition = params.get("condition") ?? "";
  const categoryId = params.get("categoryId") ?? "";
  const roomId = params.get("roomId") ?? "";
  const buildingId = params.get("buildingId") ?? "";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(
        await equipmentApi.list({
          page,
          limit: 20,
          search: search || undefined,
          condition: condition || undefined,
          categoryId: categoryId || undefined,
          roomId: roomId || undefined,
          buildingId: buildingId || undefined,
        }),
      );
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, [page, search, condition, categoryId, roomId, buildingId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Thiết bị"
        description="Danh sách thiết bị trên toàn hệ thống"
      />
      <form
        className="card mb-5 grid gap-3 sm:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const nextSearch = String(form.get("search") ?? "");
          const nextCondition = String(form.get("condition") ?? "");
          const nextCategoryId = String(form.get("categoryId") ?? "");
          const nextRoomId = String(form.get("roomId") ?? "");
          const nextBuildingId = String(form.get("buildingId") ?? "");
          setParams({
            ...(nextSearch ? { search: nextSearch } : {}),
            ...(nextCondition ? { condition: nextCondition } : {}),
            ...(nextCategoryId ? { categoryId: nextCategoryId } : {}),
            ...(nextRoomId ? { roomId: nextRoomId } : {}),
            ...(nextBuildingId ? { buildingId: nextBuildingId } : {}),
          });
        }}
      >
        <input
          className="field"
          name="search"
          defaultValue={search}
          placeholder="Tìm theo serial"
        />
        <select className="field" name="condition" defaultValue={condition}>
          <option value="">Tất cả tình trạng</option>
          {["NEW", "GOOD", "DAMAGED", "BROKEN", "LOST"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <input
          className="field"
          name="categoryId"
          defaultValue={categoryId}
          placeholder="Category ID (tùy chọn)"
        />
        <input
          className="field"
          name="roomId"
          defaultValue={roomId}
          placeholder="Room ID (tùy chọn)"
        />
        <input
          className="field"
          name="buildingId"
          defaultValue={buildingId}
          placeholder="Building ID (tùy chọn)"
        />
        <button className="btn-primary">Lọc</button>
      </form>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !result?.items.length ? (
        <div className="card">
          <EmptyState message="Không có thiết bị phù hợp" />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="p-3">Loại</th>
                <th>Serial</th>
                <th>Phòng</th>
                <th>Tòa nhà</th>
                <th>Tình trạng</th>
                <th>Ngày mua</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr className="border-b" key={item.id}>
                  <td className="p-3">{item.category.name}</td>
                  <td>{item.serialNumber ?? "—"}</td>
                  <td>{item.room.roomNumber}</td>
                  <td>{item.room.buildingName}</td>
                  <td>
                    <StatusBadge status={item.condition} />
                  </td>
                  <td>{formatDate(item.purchaseDate)}</td>
                  <td>
                    <Link
                      className="text-brand-600"
                      to={`/admin/rooms/${item.room.id}`}
                    >
                      Xem phòng
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            meta={result.pagination}
            onChange={(next) =>
              setParams({
                ...(search ? { search } : {}),
                ...(condition ? { condition } : {}),
                ...(categoryId ? { categoryId } : {}),
                ...(roomId ? { roomId } : {}),
                ...(buildingId ? { buildingId } : {}),
                page: String(next),
              })
            }
          />
        </div>
      )}
    </>
  );
}
