import type { ContractStatus } from "../models/contract.model.js";
import type { ResidenceHistoryItem } from "../repositories/interfaces/contract.repository.interface.js";
export function isResidenceEligible(
  status: ContractStatus,
  endedAt?: Date | null,
) {
  return (
    status === "ACTIVE" ||
    status === "ENDED" ||
    (status === "CANCELLED" && !!endedAt)
  );
}
export function normalizeResidenceHistory(items: ResidenceHistoryItem[]) {
  const activeCount = items.filter((item) => item.isCurrent).length;
  return items
    .filter((item) => isResidenceEligible(item.status, item.actualEndDate))
    .map((item) =>
      activeCount > 1
        ? {
            ...item,
            consistencyIssues: [
              ...item.consistencyIssues,
              "MULTIPLE_ACTIVE_CONTRACTS",
            ],
          }
        : item,
    )
    .sort(
      (a, b) => b.segmentStartDate.getTime() - a.segmentStartDate.getTime(),
    );
}
