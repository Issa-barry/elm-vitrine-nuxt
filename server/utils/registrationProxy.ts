import type { H3Event } from "h3";
import type { IFetchError } from "ofetch";

export async function forwardRegistration(
  event: H3Event,
  path: string,
) {
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
    return await $fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: await readBody(event),
    });
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
