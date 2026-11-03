import type { ClientExpensesResponse, ExpensesQuery } from "~/config/clientExpenses";
import type { PeriodeComptableQuery } from "~/config/clientPeriodeComptable";
import type { AuthErrorInfo } from "~/config/auth";
import { normalizeAuthError } from "~/config/auth";

// Dépenses consolidées (GET /v1/mobile/depenses/mine, via
// server/api/client/expenses.get.ts) — pagination Laravel standard, voir
// config/clientExpenses.ts.
export function useClientExpenses() {
  const response = useState<ClientExpensesResponse | null>("client:expenses", () => null);
  const isLoading = useState<boolean>("client:expenses:loading", () => false);
  const error = useState<AuthErrorInfo | null>("client:expenses:error", () => null);
  // Distingue "jamais chargé" de "chargé, page vide" — même principe que
  // useClientVehicles.ts.
  const hasLoaded = useState<boolean>("client:expenses:hasLoaded", () => false);
  // Une réponse lente d'une ancienne période ne remplace jamais celle de la période courante.
  const requestSeq = useState<number>("client:expenses:seq", () => 0);
  const requestFetch = useRequestFetch();

  async function fetchExpenses(query: ExpensesQuery & PeriodeComptableQuery = {}): Promise<boolean> {
    const seq = ++requestSeq.value;
    isLoading.value = true;
    error.value = null;
    try {
      const result = await requestFetch<ClientExpensesResponse>("/api/client/expenses", { query });
      if (seq !== requestSeq.value) return false;
      response.value = result;
      hasLoaded.value = true;
      return true;
    } catch (fetchError) {
      if (seq !== requestSeq.value) return false;
      error.value = normalizeAuthError(fetchError);
      response.value = null;
      return false;
    } finally {
      if (seq === requestSeq.value) isLoading.value = false;
    }
  }

  return { response, isLoading, error, hasLoaded, fetchExpenses };
}
