import type { H3Event } from "h3";

export async function forwardPasswordResetRequest(
  event: H3Event,
  path: "lookup" | "verify" | "reset",
) {
  const config = useRuntimeConfig(event);
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
  } catch (error: any) {
    const statusCode = Number(error?.response?.status || error?.statusCode || 502);
    const upstreamData = error?.data || error?.response?._data || {};

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
