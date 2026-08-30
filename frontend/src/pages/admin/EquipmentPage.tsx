import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/ui/States";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { roomApi } from "../../features/rooms/api/room.api";
import { normalizeApiError } from "../../services/api-client";
import type { Equipment } from "../../types/api";
export function EquipmentPage() {
  const [roomId, setRoomId] = useState(""),
    [items, setItems] = useState<Equipment[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  async function load() {
    if (!roomId) return;
    setLoading(true);
    setError("");
    try {
      setItems((await roomApi.equipment(roomId)).items);
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Thiết bị"
        description="Backend cung cấp danh sách thiết bị theo phòng"
      />
      <div className="card mb-5 flex gap-3">
        <input
          className="field"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Nhập Room ID"
        />
        <button className="btn-primary" onClick={load}>
          Xem thiết bị
        </button>
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length ? (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Serial</th>
                <th>Category ID</th>
                <th>Tình trạng</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr className="border-b" key={i.id}>
                  <td className="p-3">{i.serialNumber ?? "—"}</td>
                  <td>{i.categoryId}</td>
                  <td>
                    <StatusBadge status={i.condition} />
                  </td>
                  <td>
                    <Link
                      className="text-brand-600"
                      to={`/admin/rooms/${roomId}`}
                    >
                      Xem phòng
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <EmptyState message="Nhập Room ID để xem thiết bị" />
        </div>
      )}
    </>
  );
}
