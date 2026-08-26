import { $fetch as rawFetch } from "ofetch";
import type { ClientVehicle } from "~/config/clientVehicles";
import type { AuthErrorInfo } from "~/config/auth";
import { normalizeAuthError } from "~/config/auth";

export function useClientVehicles() {
  const vehicles = useState<ClientVehicle[]>("client:vehicles", () => []);
  const isLoading = useState<boolean>("client:vehicles:loading", () => false);
  const error = useState<AuthErrorInfo | null>("client:vehicles:error", () => null);
  // Distingue "jamais chargé" de "chargé, liste vide" — nécessaire pour ne
  // jamais afficher un état vide avant la première réponse réelle du backend
  // (voir demande du 26/08/2026, section 24 : jamais de données fictives
  // pendant le chargement).
  const hasLoaded = useState<boolean>("client:vehicles:hasLoaded", () => false);

  async function fetchVehicles(): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      vehicles.value = await rawFetch<ClientVehicle[]>("/api/client/vehicles");
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
