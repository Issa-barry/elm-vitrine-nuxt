import type { IFetchError } from "ofetch";
import { resolveMonolithBaseUrl } from "../../config/auth";

interface CallMonolithOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  /** Bearer token Sanctum — jamais lu depuis le navigateur, voir authSession.ts. */
  token?: string;
  /**
   * Query string (dashboard/depenses/activite/commandes — filtres et
   * pagination, voir docs/api-espace-client-contract.md côté elm-monolithe).
   * `undefined` retire le paramètre (ofetch) — laisse l'appelant passer un
   * objet de filtres sans avoir à retirer lui-même les clés absentes.
   */
  query?: Record<string, string | number | undefined>;
}

// Client HTTP générique vers elm-monolithe — utilisé par server/api/auth/*
// (login/me/logout/logout-all) et server/api/client/* (profile/vehicules).
// Équivalent pour ces routes de ce que registrationProxy.ts et
// passwordResetProxy.ts font déjà pour inscription/mot-de-passe-oublié :
// résolution de baseURL + normalisation d'erreur upstream identiques, en
// gardant ces deux fichiers existants inchangés (hors périmètre de ce
// chantier) plutôt que de les refactoriser sans nécessité.
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
      statusMessage: "Service non configuré.",
      data: { message: "Le service n'est pas encore configuré sur cette vitrine." },
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
    //
    // retry : uniquement pour GET (idempotent — jamais pour POST/PATCH, qui
    // pourraient dupliquer un effet de bord). Cible les pannes réseau
    // transitoires serveur-à-serveur (timeout, connexion refusée/relancée) ;
    // ofetch ne réessaie déjà par défaut que sur des statuts HTTP
    // typiquement transitoires (408/429/5xx), jamais sur un vrai refus
    // métier (401/403/404/422).
    const data = await $fetch(`${baseUrl}${path}`, {
      method: options.method || "GET",
      headers,
      // `options.body` est volontairement typé `unknown` côté appelant (pas
      // de forme imposée aux appelants de callMonolith) — non assignable tel
      // quel au type `body` de $fetch (union BodyInit/Record<string,any>),
      // d'où ce cast vers l'union réelle attendue (jamais `any`, voir règle
      // @typescript-eslint/no-explicit-any) — seul endroit où la frontière
      // est franchie (CI l'a révélé : `nuxt typecheck` en local s'appuyait
      // sur un cache .nuxt périmé qui masquait cette erreur).
      body: options.body as Record<string, unknown> | BodyInit | null | undefined,
      query: options.query,
      retry: options.method && options.method !== "GET" ? 0 : 2,
      retryDelay: 300,
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
        "Le service est momentanément indisponible.",
      data: upstreamData,
    });
  }
}
