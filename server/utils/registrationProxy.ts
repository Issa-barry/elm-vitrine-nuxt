import type { H3Event } from "h3";

export async function forwardRegistration(
  event: H3Event,
  path: string,
) {
  const config = useRuntimeConfig(event);
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
  } catch (error: any) {
    const statusCode = Number(error?.response?.status || error?.statusCode || 502);
    const upstreamData = error?.data || error?.response?._data || {};

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
