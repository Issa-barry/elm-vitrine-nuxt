import type { IFetchError } from "ofetch";
import { resolveMonolithBaseUrl } from "../../config/auth";

interface CallMonolithOptions {
  method?: "GET" | "POST";
  body?: unknown;
  /** Bearer token Sanctum — jamais lu depuis le navigateur, voir authSession.ts. */
  token?: string;
}

// Équivalent pour l'auth (login/me/logout/logout-all) de ce que
// registrationProxy.ts et passwordResetProxy.ts font déjà pour
// inscription/mot-de-passe-oublié : résolution de baseURL + normalisation
// d'erreur upstream identiques, en gardant les fichiers existants inchangés
// (hors périmètre de ce chantier) plutôt que de les refactoriser sans
// nécessité.
export async function callMonolith<T = unknown>(path: string, options: CallMonolithOptions = {}): Promise<T> {
  // event omis : optionnel côté Nitro (nitropack/dist/runtime/config.d.ts),
  // sans effet sur un preset Node classique — évite une collision de type
  // avec le useRuntimeConfig() app-side (voir docs/environment.md), même
  // convention que registrationProxy.ts.
  const config = useRuntimeConfig();
  const baseUrl = resolveMonolithBaseUrl(config);

  if (!baseUrl) {
    throw createError({
      statusCode: 503,
      statusMessage: "Service d'authentification non configuré.",
      data: { message: "Le service d'authentification n'est pas encore configuré sur cette vitrine." },
    });
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  try {
    // $fetch(...) sans générique explicite : même raison que
    // registrationProxy.ts/passwordResetProxy.ts — le chemin est construit
    // dynamiquement, rien à inférer ici. Le type de retour de callMonolith
    // (Promise<T>) porte la forme réelle, fixée par chaque appelant.
    const data = await $fetch(`${baseUrl}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body,
    });
    return data as T;
  } catch (error) {
    const fetchError = error as IFetchError;
    const statusCode = Number(fetchError.response?.status || fetchError.statusCode || 502);
    const upstreamData = (fetchError.data || fetchError.response?._data || {}) as Record<string, unknown>;

    throw createError({
      statusCode,
      statusMessage:
        (upstreamData.message as string) ||
        (upstreamData.error as string) ||
        "Le service d'authentification est momentanément indisponible.",
      data: upstreamData,
    });
  }
}
