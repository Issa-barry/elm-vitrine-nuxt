import type { H3Event } from "h3";
import type { IFetchError } from "ofetch";

export async function forwardPasswordResetRequest(
  event: H3Event,
  path: "lookup" | "verify" | "reset",
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
      statusMessage: "Service de récupération non configuré.",
    });
  }

  try {
    return await $fetch(`${baseUrl}/api/auth/password/${path}`, {
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
        upstreamData?.error ||
        upstreamData?.message ||
        "Le service est momentanément indisponible.",
      data: upstreamData,
    });
  }
}
