import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { deriveAlerts } from "@/services/selectors";
import { dashboardService } from "@/services/dashboardService";

export function useDashboardQuery() {
  const { currentUser, clients, contracts, fracs, payments } = useAppContext();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => dashboardService.stats("year"),
    enabled: !!currentUser,
    staleTime: 120_000,
  });

  const { data: midia } = useQuery({
    queryKey: ["dashboard-midia"],
    queryFn: () => dashboardService.midia(),
    enabled: !!currentUser,
    staleTime: 60_000,
  });

  const data = useMemo(() => {
    if (!stats || !midia) return null;
    const totalLots = fracs.reduce((s, f) => s + (f.total_lots || 0), 0);
    const availableLots = fracs.reduce((s, f) => s + (f.available_lots || 0), 0);
    const soldLots = fracs.reduce((s, f) => s + (f.sold_lots || 0), 0);
    const reservedLots = fracs.reduce((s, f) => s + (f.reserved_lots || 0), 0);
    return {
      totals: {
        paidRevenue: stats.revenue,
        availableLots,
        totalLots,
        soldLots,
        reservedLots,
        openRevenue: payments.filter((p) => p.status !== "paid").reduce((sum, p) => sum + Number(p.amount || 0), 0),
        clients: clients.length,
        contracts: contracts.length,
      },
      alerts: midia.tasks || [],
      recentContracts: [...contracts]
        .sort((a, b) => new Date(b.contract_date) - new Date(a.contract_date))
        .slice(0, 4),
      chartData: stats.chart_data,
      midia,
    };
  }, [stats, midia, clients, contracts, fracs]);

  return { data };
}

export function useProjectsQuery() {
  const { fracs } = useAppContext();

  return useQuery({
    queryKey: ["projects", fracs],
    queryFn: () =>
      fracs.map((inmueble) => ({
        id: inmueble.id,
        name: inmueble.name,
        createdAt: inmueble.created_at,
        lots: Array.from({ length: inmueble.total_lots || 0 }),
        available: inmueble.available_lots ?? 0,
        sold: inmueble.sold_lots ?? 0,
        reserved: inmueble.reserved_lots ?? 0,
        inventoryValue: 0,
      })),
  });
}

export function useAlertsQuery() {
  const { payments, contracts, documents, clients } = useAppContext();

  return useQuery({
    queryKey: ["alerts", payments, contracts, documents, clients],
    queryFn: () => deriveAlerts({ payments, contracts, documents, clients }),
  });
}
