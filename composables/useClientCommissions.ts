import type { VehicleCommission, VehicleCommissionWithVehicle } from "~/config/clientCommissions";
import type { AuthErrorInfo } from "~/config/auth";
import { normalizeAuthError } from "~/config/auth";

// Commissions consolidées sur tous les véhicules accessibles — aucun
// endpoint backend "toutes commissions" n'existe (voir config/
// clientCommissions.ts), donc cette page assemble elle-même
// GET /v1/mobile/vehicules/{id}/commissions pour chaque véhicule de
// useClientVehicles() (liste déjà réduite au périmètre du compte connecté,
// jamais devinée ici). Un appel par véhicule, pas de N+1 caché : le nombre
// de véhicules d'un même compte reste petit (voir docs/api-espace-client-
// contract.md — même limite déjà acceptée pour /vehicules/{id}/frais avant
// l'ajout de /depenses/mine).
export function useClientCommissions() {
  const commissions = useState<VehicleCommissionWithVehicle[]>("client:commissions", () => []);
  const isLoading = useState<boolean>("client:commissions:loading", () => false);
  const error = useState<AuthErrorInfo | null>("client:commissions:error", () => null);
  const hasLoaded = useState<boolean>("client:commissions:hasLoaded", () => false);
  const requestFetch = useRequestFetch();
  const { vehicles, hasLoaded: vehiclesLoaded, fetchVehicles } = useClientVehicles();

  async function fetchCommissions(): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      if (!vehiclesLoaded.value) {
        await fetchVehicles();
      }

      const perVehicle = await Promise.all(
        vehicles.value.map(async (vehicle) => {
          const rows = await requestFetch<VehicleCommission[]>(`/api/client/vehicles/${vehicle.id}/commissions`);
          return rows.map((row: VehicleCommission): VehicleCommissionWithVehicle => ({
            ...row,
            vehicule: { id: vehicle.id, nom: vehicle.nom, immatriculation: vehicle.immatriculation },
          }));
        }),
      );

      // Tri par date décroissante — même convention que /v1/mobile/activite
      // (déjà trié par le backend) ; ici le tri doit être refait côté Nuxt
      // puisqu'il fusionne plusieurs réponses backend distinctes.
      commissions.value = perVehicle.flat().sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
      hasLoaded.value = true;
      return true;
    } catch (fetchError) {
      error.value = normalizeAuthError(fetchError);
      commissions.value = [];
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return { commissions, isLoading, error, hasLoaded, fetchCommissions };
}
