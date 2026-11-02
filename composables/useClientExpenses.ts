import type { ClientExpensesResponse, ExpensesQuery } from "~/config/clientExpenses";
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
  const requestFetch = useRequestFetch();

  async function fetchExpenses(query: ExpensesQuery = {}): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      response.value = await requestFetch<ClientExpensesResponse>("/api/client/expenses", { query });
      hasLoaded.value = true;
      return true;
    } catch (fetchError) {
      error.value = normalizeAuthError(fetchError);
      response.value = null;
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return { response, isLoading, error, hasLoaded, fetchExpenses };
}
