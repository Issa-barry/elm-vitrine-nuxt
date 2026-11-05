import type { CommissionCompte, CommissionsCompteQuery, CommissionsCompteResponse } from "~/config/clientCommissionsCompte";
import type { AuthErrorInfo } from "~/config/auth";
import { normalizeAuthError } from "~/config/auth";

// Détail des commissions du compte (GET /v1/mobile/commissions via le BFF
// server/api/client/commissions.get.ts). « Voir plus » ajoute la page suivante ;
// tout changement de filtre repart de la première page. Une réponse lente d'un
// ancien filtre ne remplace jamais celle du filtre courant.
export function useClientCommissionsCompte() {
  const lignes = ref<CommissionCompte[]>([]);
  const reponse = ref<CommissionsCompteResponse | null>(null);
  const isLoading = ref(false);
  const error = ref<AuthErrorInfo | null>(null);
  const requestFetch = useRequestFetch();
  let seq = 0;
  let derniereQuery: CommissionsCompteQuery = {};

  async function charger(query: CommissionsCompteQuery, ajouter = false): Promise<void> {
    const courant = ++seq;
    isLoading.value = true;
    error.value = null;
    try {
      const resultat = await requestFetch<CommissionsCompteResponse>("/api/client/commissions", { query });
      if (courant !== seq) return;
      reponse.value = resultat;
      lignes.value = ajouter ? [...lignes.value, ...resultat.data] : resultat.data;
    } catch (fetchError) {
      if (courant !== seq) return;
      error.value = normalizeAuthError(fetchError);
      if (!ajouter) {
        lignes.value = [];
        reponse.value = null;
      }
    } finally {
      if (courant === seq) isLoading.value = false;
    }
  }

  function fetchCommissions(query: CommissionsCompteQuery): Promise<void> {
    derniereQuery = { ...query, page: undefined };
    return charger(derniereQuery);
  }

  const aDAutresPages = computed(() => (reponse.value ? reponse.value.meta.current_page < reponse.value.meta.last_page : false));

  function voirPlus(): Promise<void> {
    if (!reponse.value || !aDAutresPages.value) return Promise.resolve();
    return charger({ ...derniereQuery, page: reponse.value.meta.current_page + 1 }, true);
  }

  return { lignes, reponse, isLoading, error, aDAutresPages, fetchCommissions, voirPlus };
}
