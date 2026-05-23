import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { deriveAlerts, deriveDashboardSnapshot, deriveProjects } from "@/services/selectors";

export function useDashboardQuery() {
  const { currentUser, clients, contracts, payments, documents, fracs } = useAppContext();

  return useQuery({
    queryKey: ["dashboard-snapshot", currentUser, clients, contracts, payments, documents, fracs],
    queryFn: () =>
      deriveDashboardSnapshot({
        currentUser,
        clients,
        contracts,
        payments,
        documents,
        fracs
      })
  });
}

export function useProjectsQuery() {
  const { fracs } = useAppContext();

  return useQuery({
    queryKey: ["projects", fracs],
    queryFn: () => deriveProjects(fracs)
  });
}

export function useAlertsQuery() {
  const { payments, contracts, documents, clients } = useAppContext();

  return useQuery({
    queryKey: ["alerts", payments, contracts, documents, clients],
    queryFn: () => deriveAlerts({ payments, contracts, documents, clients })
  });
}
