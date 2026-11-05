import type { ClientVehicleRattache } from "~/config/clientVehicles";
import type { AuthErrorInfo } from "~/config/auth";
import { normalizeAuthError } from "~/config/auth";

// Tous les véhicules rattachés au compte (GET /v1/mobile/vehicules/rattaches,
// ADR 0054 côté elm-monolithe), pour la page Véhicules. Les filtres des écrans
// Ventes et Dépenses gardent useClientVehicles() : un véhicule seulement parrainé
// n'y ouvre aucune donnée.
export function useClientVehiclesRattaches() {
  const vehicles = useState<ClientVehicleRattache[]>("client:vehicles-rattaches", () => []);
  const isLoading = useState<boolean>("client:vehicles-rattaches:loading", () => false);
  const error = useState<AuthErrorInfo | null>("client:vehicles-rattaches:error", () => null);
  // Distingue « jamais chargé » de « chargé, liste vide » : jamais d'état vide avant la première réponse.
  const hasLoaded = useState<boolean>("client:vehicles-rattaches:hasLoaded", () => false);
  const requestFetch = useRequestFetch();

  async function fetchVehicles(): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      vehicles.value = await requestFetch<ClientVehicleRattache[]>("/api/client/vehicles/rattaches");
      hasLoaded.value = true;
      return true;
    } catch (fetchError) {
      error.value = normalizeAuthError(fetchError);
      vehicles.value = [];
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return { vehicles, isLoading, error, hasLoaded, fetchVehicles };
}
