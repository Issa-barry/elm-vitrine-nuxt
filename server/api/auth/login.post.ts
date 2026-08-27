import { buildLoginPayload } from "../../../config/auth";
import type { AuthUser } from "../../../config/auth";
import { callMonolith } from "../../utils/monolithClient";
import { setSessionToken } from "../../utils/authSession";

interface LoginRequestBody {
  telephone?: string;
  password?: string;
}

interface LoginUpstreamResponse {
  token: string;
  user: AuthUser;
}

// POST /api/auth/login (Nuxt) → POST /api/auth/login (Laravel, contrat exact
// dans docs/api-auth-contract.md côté elm-monolithe). Le token Sanctum
// obtenu ne quitte jamais ce serveur : il est scellé dans le cookie de
// session Nuxt (authSession.ts), seul `user` repart au navigateur.
export default defineEventHandler(async (event) => {
  const body = await readBody<LoginRequestBody>(event);

  if (!body?.telephone || !body?.password) {
    throw createError({
      statusCode: 422,
      statusMessage: "Numéro de téléphone et mot de passe requis.",
      data: { message: "Numéro de téléphone et mot de passe requis.", errors: {} },
    });
  }

  const payload = buildLoginPayload({ telephone: body.telephone, password: body.password });

  const data = await callMonolith<LoginUpstreamResponse>("/api/auth/login", {
    method: "POST",
    body: payload,
  });

  await setSessionToken(event, data.token);

  return { user: data.user };
});
