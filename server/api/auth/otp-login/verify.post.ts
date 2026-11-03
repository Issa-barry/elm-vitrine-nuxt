import type { AuthUser } from "../../../../config/auth";
import { DEVICE_NAME } from "../../../../config/auth";
import { callMonolith } from "../../../utils/monolithClient";
import { setSessionToken } from "../../../utils/authSession";

interface OtpVerifyBody {
  telephone?: string;
  code?: string;
}

interface OtpVerifyUpstreamResponse {
  token: string;
  user: AuthUser;
}

// POST /api/auth/otp-login/verify (Nuxt) → POST /api/auth/otp-login/verify
// (Laravel, App\Http\Controllers\Api\Auth\OtpLogin\VerifyController) — étape
// 2 de la connexion sans mot de passe. Réponse upstream identique à
// POST /api/auth/login ({token, user}, même trait backend partagé
// IssuesTelephoneLoginToken) : même traitement exact que login.post.ts — le
// token Sanctum ne quitte jamais ce serveur, scellé dans le même cookie de
// session BFF (authSession.ts), seul `user` repart au navigateur.
export default defineEventHandler(async (event) => {
  const body = await readBody<OtpVerifyBody>(event);

  if (!body?.telephone || !body?.code) {
    throw createError({
      statusCode: 422,
      statusMessage: "Numéro de téléphone et code requis.",
      data: { message: "Numéro de téléphone et code requis.", errors: {} },
    });
  }

  const data = await callMonolith<OtpVerifyUpstreamResponse>("/api/auth/otp-login/verify", {
    method: "POST",
    body: { telephone: body.telephone, code: body.code, device_name: DEVICE_NAME },
  });

  await setSessionToken(event, data.token);

  return { user: data.user };
});
