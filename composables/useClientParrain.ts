import type { AuthErrorInfo } from "~/config/auth";
import { normalizeAuthError } from "~/config/auth";
import type {
  ParrainCommission,
  ParrainCommissionsQuery,
  ParrainCommissionsResponse,
  ParrainPaiement,
  ParrainPaiementsQuery,
  ParrainPaiementsResponse,
  ParrainSynthese,
  ParrainTotaux,
  ParrainVehicule,
} from "~/config/clientParrain";

// Espace parrain (server/api/client/parrain/*). `notAttached` : Laravel répond
// 404 si le compte n'est pas (ou plus) rattaché ; les menus sont recalculés
// sans déconnecter, un détachement ne supprime pas le compte.
export function useClientParrain() {
  const synthese = useState<ParrainSynthese | null>("client:parrain:synthese", () => null);
  const vehicules = useState<ParrainVehicule[]>("client:parrain:vehicules", () => []);
  const commissions = useState<ParrainCommission[]>("client:parrain:commissions", () => []);
  const commissionsResume = useState<ParrainTotaux | null>("client:parrain:commissions:resume", () => null);
  const commissionsMeta = useState<ParrainCommissionsResponse["meta"] | null>("client:parrain:commissions:meta", () => null);
  const paiements = useState<ParrainPaiement[]>("client:parrain:paiements", () => []);
  const paiementsMeta = useState<ParrainPaiementsResponse["meta"] | null>("client:parrain:paiements:meta", () => null);
  const isLoading = useState<boolean>("client:parrain:loading", () => false);
  const error = useState<AuthErrorInfo | null>("client:parrain:error", () => null);
  const notAttached = useState<boolean>("client:parrain:notAttached", () => false);
  // Changement rapide de filtre : seule la dernière réponse s'affiche, sinon une
  // réponse lente remplacerait les montants du filtre choisi ensuite.
  const commissionsSeq = useState<number>("client:parrain:commissions:seq", () => 0);
  const requestFetch = useRequestFetch();
  const { reloadUser } = useAuth();

  async function load<T>(path: string, query: Record<string, unknown>, apply: (data: T) => void): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      apply((await requestFetch<T>(path, { query })) as T);
      notAttached.value = false;
      return true;
    } catch (fetchError) {
      const info = normalizeAuthError(fetchError);
      if (info.status === 404) {
        notAttached.value = true;
        void reloadUser();
      } else {
        error.value = info;
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  const fetchSynthese = () =>
    load<ParrainSynthese>("/api/client/parrain/synthese", {}, (data) => {
      synthese.value = data;
    });

  const fetchVehicules = () =>
    load<{ data: ParrainVehicule[] }>("/api/client/parrain/vehicules", {}, (data) => {
      vehicules.value = data.data;
    });

  // `append` : page suivante ajoutée à la liste déjà affichée ("Afficher plus").
  const fetchCommissions = (query: ParrainCommissionsQuery = {}, append = false) => {
    const seq = ++commissionsSeq.value;
    return load<ParrainCommissionsResponse>("/api/client/parrain/commissions", query, (data) => {
      if (seq !== commissionsSeq.value) return;
      const rows = data.data as ParrainCommission[];
      commissions.value = append ? [...commissions.value, ...rows] : rows;
      commissionsResume.value = data.resume;
      commissionsMeta.value = data.meta;
    });
  };

  const fetchPaiements = (query: ParrainPaiementsQuery = {}, append = false) =>
    load<ParrainPaiementsResponse>("/api/client/parrain/paiements", query, (data) => {
      paiements.value = append ? [...paiements.value, ...data.data] : data.data;
      paiementsMeta.value = data.meta;
    });

  return {
    synthese,
    vehicules,
    commissions,
    commissionsResume,
    commissionsMeta,
    paiements,
    paiementsMeta,
    isLoading,
    error,
    notAttached,
    fetchSynthese,
    fetchVehicules,
    fetchCommissions,
    fetchPaiements,
  };
}
