import type { H3Event } from "h3";
import type { IFetchError } from "ofetch";

export async function forwardPasswordResetRequest<T = unknown>(
  event: H3Event,
  // `string` et non un littéral union ("lookup" | "verify" | "reset") :
  // avec 3 fichiers frères (lookup/verify/reset.post.ts) fournissant chacun
  // une branche de l'union, le générateur de routes internes de Nitro fusionne
  // les 3 types de retour en une seule union (répliqué en environnement propre
  // via `npm ci` isolé). Un `path: string` simple, comme sur
  // registrationProxy.ts::forwardRegistration (jamais ce problème), évite la
  // fusion — la sécurité de type reste portée par le type union du paramètre
  // à l'appel (voir lookup/verify/reset.post.ts) plutôt que par la signature.
  path: string,
): Promise<T> {
  // event omis : optionnel côté Nitro (nitropack/dist/runtime/config.d.ts),
  // sans effet sur un preset Node classique — évite une collision de type
  // avec le useRuntimeConfig() app-side (voir docs/environment.md).
  const config = useRuntimeConfig();
  const baseUrl = String(config.monolithApiBase || config.public.apiBase || "")
    .trim()
    .replace(/\/$/, "");

  if (!baseUrl) {
    throw createError({
      statusCode: 503,
      statusMessage: "Service de récupération non configuré.",
    });
  }

  try {
    // $fetch(...) sans générique explicite : le chemin est construit
    // dynamiquement (jamais un littéral connu de Nuxt), donc rien à inférer
    // ici — c'est le type de retour de la fonction (Promise<T>) qui porte
    // la forme réelle, fixée par chaque appelant (voir lookup/verify/reset.post.ts).
    const data = await $fetch(`${baseUrl}/api/auth/password/${path}`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: await readBody(event),
    });
    return data as T;
  } catch (error) {
    const fetchError = error as IFetchError;
    const statusCode = Number(fetchError.response?.status || fetchError.statusCode || 502);
    const upstreamData = fetchError.data || fetchError.response?._data || {};

    throw createError({
      statusCode,
      statusMessage:
        upstreamData?.error ||
        upstreamData?.message ||
        "Le service est momentanément indisponible.",
      data: upstreamData,
    });
  }
}
