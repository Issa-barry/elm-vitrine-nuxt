import type { H3Event } from "h3";
import { shouldUseSecureCookies } from "../../config/auth";

// Le Bearer token Sanctum n'est jamais exposé au JavaScript navigateur ni
// stocké en clair côté client (pas de localStorage, pas de cookie lisible en
// JS) : il est contenu dans cette session Nuxt scellée (chiffrée + signée),
// transmise via un cookie httpOnly, et n'est manipulé en clair que par Nitro
// lui-même, après ouverture de la session (voir getSessionToken ci-dessous).
// `useSession`/`clearSession` viennent de h3 (déjà une dépendance de Nitro,
// aucune nouvelle dépendance ajoutée) : ils gèrent le scellement
// (iron-webcrypto) et le cookie pour nous — voir docs/environment.md pour le
// détail de l'architecture BFF retenue.
const SESSION_COOKIE_NAME = "elm_auth_session";

// 30 jours : confort de session côté navigateur, indépendant de l'expiration
// réelle du token Sanctum côté Laravel (SANCTUM_EXPIRATION_MINUTES, 90 jours
// par défaut — voir docs/api-auth-contract.md côté elm-monolithe), qui fait
// foi : un token expiré ou révoqué invalide la session au prochain /api/auth/me
// (voir me.get.ts) même si ce cookie est encore valide.
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

// Minimum imposé par le scellement iron-webcrypto (h3 useSession).
const MIN_PASSWORD_LENGTH = 32;

// Strict minimum : le credential (token), rien d'autre. `/me` reste la
// source de vérité pour user/context après refresh (voir composables/
// useAuth.ts) — cette session ne contient jamais context, permissions, ni
// aucune donnée métier (véhicules, gains, dépenses...).
interface AuthSessionData {
  token?: string;
}

function getSessionConfig() {
  const config = useRuntimeConfig();
  const password = String(config.authSessionPassword || "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    // Ne doit jamais se produire en preprod/production : server/plugins/
    // validateRuntimeConfig.ts échoue déjà au démarrage si
    // NUXT_AUTH_SESSION_PASSWORD est absent ou trop court hors local.
    throw createError({
      statusCode: 500,
      statusMessage: "Configuration de session invalide.",
    });
  }

  return {
    password,
    name: SESSION_COOKIE_NAME,
    maxAge: SESSION_MAX_AGE_SECONDS,
    cookie: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: shouldUseSecureCookies(String(config.public.environment || "local")),
      path: "/",
    },
  };
}

export async function getSessionToken(event: H3Event): Promise<string | null> {
  const session = await useSession<AuthSessionData>(event, getSessionConfig());
  return session.data.token || null;
}

export async function setSessionToken(event: H3Event, token: string): Promise<void> {
  const session = await useSession<AuthSessionData>(event, getSessionConfig());
  await session.update({ token });
}

export async function clearAuthSession(event: H3Event): Promise<void> {
  const session = await useSession<AuthSessionData>(event, getSessionConfig());
  await session.clear();
}
