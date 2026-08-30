import { useCallback, useEffect, useState } from "react";
import { contractApi } from "../features/contracts/api/contract.api";
import { studentFacilityApi } from "../features/student-facilities/api/student-facility.api";
import { normalizeApiError } from "../services/api-client";
import type { Bed, Contract, StudentRoom } from "../types/api";

export function useStudentRoom() {
  const [contract, setContract] = useState<Contract | null>(null);
  const [room, setRoom] = useState<StudentRoom | null>(null);
  const [bed, setBed] = useState<Bed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const activeContract = await contractApi.active();
      setContract(activeContract);
      if (!activeContract) {
        setRoom(null);
        setBed(null);
        return;
      }
      const roomDetail = await studentFacilityApi.room(activeContract.roomId);
      setRoom(roomDetail);
      setBed(
        roomDetail.beds?.find((item) => item.id === activeContract.bedId) ??
          null,
      );
    } catch (requestError) {
      setError(normalizeApiError(requestError).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { contract, room, bed, loading, error, reload: load };
}
