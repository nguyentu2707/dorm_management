export interface IDashboardRepository {
  counts(): Promise<{
    rooms: { status: string; count: number }[];
    beds: { status: string; count: number }[];
    contracts: { status: string; count: number }[];
    roomChanges: number;
    checkoutRequests: number;
    maintenance: { status: string; count: number }[];
  }>;
}
