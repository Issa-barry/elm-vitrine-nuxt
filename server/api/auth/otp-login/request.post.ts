import type { OtpLoginRequestResponse } from "../../../../config/auth";
import { callMonolith } from "../../../utils/monolithClient";

interface OtpRequestBody {
  telephone?: string;
}

// POST /api/auth/otp-login/request (Nuxt) → POST /api/auth/otp-login/request
// (Laravel, contrat vérifié dans App\Http\Controllers\Api\Auth\OtpLogin\
// RequestController — voir config/auth.ts). Étape 1 de la connexion sans mot
// de passe : envoie un code, ne touche jamais à la session (celle-ci n'est
// établie qu'à l'étape 2, voir verify.post.ts).
export default defineEventHandler(async (event) => {
  const body = await readBody<OtpRequestBody>(event);

  if (!body?.telephone) {
    throw createError({
      statusCode: 422,
      statusMessage: "Numéro de téléphone requis.",
      data: { message: "Numéro de téléphone requis.", errors: {} },
    });
  }

  return await callMonolith<OtpLoginRequestResponse>("/api/auth/otp-login/request", {
    method: "POST",
    body: { telephone: body.telephone },
  });
});
