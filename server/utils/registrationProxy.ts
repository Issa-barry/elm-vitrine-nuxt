import type { H3Event } from "h3";
import type { IFetchError } from "ofetch";

export async function forwardRegistration<T = unknown>(
  event: H3Event,
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
      statusMessage: "Service d’inscription non configuré.",
      data: {
        message:
          "Le service d’inscription n’est pas encore configuré sur cette vitrine.",
      },
    });
  }

  try {
    // $fetch(...) sans générique explicite : le chemin est construit
    // dynamiquement (jamais un littéral connu de Nuxt), donc rien à inférer
    // ici — c'est le type de retour de la fonction (Promise<T>) qui porte
    // la forme réelle, fixée par chaque appelant (voir check-phone.post.ts).
    const data = await $fetch(`${baseUrl}${path}`, {
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
        upstreamData?.message ||
        upstreamData?.error ||
        "Le service d’inscription est momentanément indisponible.",
      data: upstreamData,
    });
  }
}
