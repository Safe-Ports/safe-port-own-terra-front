import { useQuery } from "@tanstack/react-query";
import propertiesService from "@/services/propertiesService";

export const buildingSpecKey = (inmuebleId) => ["properties", "specs", inmuebleId];

/** Ficha técnica del edificio de una comunidad; `null` si aún no tiene. */
export function useBuildingSpec(inmuebleId) {
  return useQuery({
    queryKey: buildingSpecKey(inmuebleId),
    queryFn: () => propertiesService.specs.get(inmuebleId),
    enabled: Boolean(inmuebleId),
    retry: false,
  });
}
