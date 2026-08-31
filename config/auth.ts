import type { IFetchError } from "ofetch";
import type { ApiMeResponse } from "~/types/api";

// Contrat exact de elm-monolithe (voir docs/api-auth-contract.md côté backend,
// et l'audit du 26/08/2026) : Sanctum Bearer, pas de cookie de session Laravel.
// Ce module ne fait aucun appel réseau — logique pure, partagée entre le
// composable client (composables/useAuth.ts) et le BFF Nitro
// (server/utils/monolithClient.ts, server/api/auth/*) — pour rester testable
// sans backend ni contexte Nuxt (voir config/auth.test.ts).

// `device_name` nomme le token Sanctum créé (voir LoginController côté
// backend) : centralisé ici pour ne jamais le hardcoder dans plusieurs
// composants, conformément à la convention suggérée par le contrat backend
// ("elm-mobile-android", "elm-mobile-ios", "elm-nuxt-web").
export const DEVICE_NAME = "elm-nuxt-web";

// Dérivé du contrat OpenAPI généré (chantier du 27/08/2026, voir
// types/api.ts, ApiMeResponse). `context` exclu ici volontairement, voir
// AuthContext ci-dessous : GET /auth/me la renvoie toujours, mais
// /auth/login (LoginResponse, plus léger) ne la renvoie pas — deux formes
// réellement différentes, pas la même avec un champ en moins.
//
// `email` réécrit en `string | null` — IMPERFECTION OpenAPI CONSTATÉE :
// généré en `string` simple (non nullable), alors qu'un compte inscrit sans
// email (courant, l'inscription se fait par téléphone) renvoie réellement
// `email: null` — vérifié en pratique sur de vrais comptes pendant ce
// chantier (et déjà avant, voir l'historique de config/auth.test.ts). Ce
// champ vient très probablement d'un exemple de réponse où l'email était
// renseigné pour ce compte précis, jamais du vrai type nullable sous-jacent
// (même classe de défaut que AuthContext, voir plus bas). Sans ce correctif,
// TypeScript aurait laissé passer sans erreur du code non sûr sur
// `user.email` pour n'importe quel compte sans email — capturé ici
// uniquement parce que config/clientCapabilitiesFixtures.ts utilise
// délibérément `email: null` dans ses scénarios de preview.
//
// `is_active`/`qr_payload` réécrits en optionnels — pas une imperfection
// OpenAPI cette fois (ApiMeResponse les documente correctement comme requis
// sur GET /auth/me) mais une différence d'USAGE : AuthUser est partagé entre
// /auth/me (qui les renvoie toujours) ET la réponse de POST /auth/login
// (LoginResponse, plus légère, qui ne les renvoie PAS — voir
// composables/useAuth.ts::login(), qui pose `user.value = data.user` avant
// même d'avoir appelé /me). Les rendre requis casserait ce cas réel.
export type AuthUser = Omit<ApiMeResponse, "context" | "email" | "is_active" | "qr_payload"> & {
  email: string | null;
  is_active?: boolean;
  qr_payload?: string | null;
};

// Bloc `context` de GET /api/auth/me, résolu côté backend par
// ClientIdentityResolver — jamais reconstruit ni deviné côté frontend (voir
// section 6-7 de l'audit du 26/08/2026 : Nuxt n'a jamais à envoyer
// organization_id/proprietaire_id/livreur_id pour définir son périmètre).
// Volontairement écrit à la main plutôt que dérivé d'ApiMeResponse["context"]
// : le schema généré type client_id/proprietaire_id/livreur_id en `null`
// SEUL (pas `string | null`) — Scramble a visiblement inféré ces trois
// champs depuis un exemple de réponse où ils valaient null pour ce compte
// précis, jamais depuis le vrai type nullable sous-jacent (imperfection
// constatée, voir le rapport de ce chantier). Utiliser ce type généré tel
// quel aurait rendu innaccessible tout compte ayant réellement un
// client_id/proprietaire_id/livreur_id.
export interface AuthContext {
  organization_id: string | null;
  client_id: string | null;
  proprietaire_id: string | null;
  livreur_id: string | null;
  // Contexte "prestataire" (chantier UI du 27/08/2026, voir
  // config/clientCapabilities.ts) : n'existe PAS encore dans le contrat réel
  // GET /api/auth/me — champ optionnel en attendant que le backend l'expose
  // (nom exact non confirmé, "prestataire_id" choisi par cohérence avec les
  // 3 champs ci-dessus). Toujours undefined aujourd'hui en pratique ; ne
  // jamais s'appuyer sur sa présence pour une vraie décision d'autorisation
  // (Laravel reste l'autorité, voir docs/api-espace-client-contract.md).
  prestataire_id?: string | null;
}

// `code` renvoyé par LoginController et par le filet de sécurité
// EnsureApiAccountIsActive (403) — valeurs de App\Support\Auth\AccountStatus
// côté backend, ne jamais les modifier sans vérifier ce fichier.
export type AccountStatusCode = "pending_validation" | "account_blocked" | "email_not_verified";

export interface LoginInput {
  telephone: string;
  password: string;
}

export interface LoginPayload extends LoginInput {
  device_name: string;
}

export function buildLoginPayload(input: LoginInput): LoginPayload {
  return {
    telephone: input.telephone,
    password: input.password,
    device_name: DEVICE_NAME,
  };
}

// ── Connexion sans mot de passe par OTP (chantier du 27/08/2026) ───────────
// Contrat vérifié directement contre elm-monolithe : App\Http\Controllers\
// Api\Auth\OtpLogin\{RequestController,VerifyController}.php,
// App\Enums\OtpChannel, routes/api.php (POST /api/auth/otp-login/request et
// /verify). Deux appels distincts, jamais un seul (voir composables/
// useOtpLogin.ts) :
//   1. request : { telephone } -> { sent, channel, cooldown_seconds }
//   2. verify  : { telephone, code, device_name } -> { token, user } (EXACTEMENT
//      la même forme que POST /auth/login, via le trait backend partagé
//      IssuesTelephoneLoginToken — voir composables/useAuth.ts::loginWithOtp()).
//
// `channel` : indique par quel canal le code a RÉELLEMENT été envoyé, jamais
// un choix du frontend. Fermé à 3 valeurs par App\Enums\OtpChannel côté
// backend ; traité comme un enum ouvert malgré tout (jamais
// `if (channel === 'email')` comme condition de succès — le succès est
// `sent === true`), au cas où une valeur future n'aurait pas encore de
// libellé connu ici.
export type OtpChannel = "email" | "sms" | "whatsapp";

export interface OtpLoginRequestPayload {
  telephone: string;
}

// IMPERFECTION OpenAPI CONSTATÉE (régénération du 27/08/2026, voir
// types/generated/elm-api.ts, operations["auth.otp-login.request"]) :
// `cooldown_seconds` est généré en littéral `30` (Scramble l'a inféré de
// l'exemple de réponse du contrôleur, jamais du vrai type retour de
// OtpService::resendCooldownSeconds(), qui reste un nombre configurable) —
// retypé ici en `number` simple. `channel` est correctement généré en
// `string` (pas narrowed) ; refermé ici sur les 3 valeurs réelles de
// App\Enums\OtpChannel pour un typage utile côté front.
//
// `destination_masked` (ajouté le 27/08/2026, demande front) : la
// coordonnée réellement utilisée pour CE canal, DÉJÀ masquée côté serveur
// (App\Services\Otp\OtpDestinationMasker, elm-monolithe) — jamais
// reconstruite/devinée côté Nuxt à partir d'une autre source (voir
// pages/connexion.vue).
export interface OtpLoginRequestResponse {
  sent: true;
  channel: OtpChannel;
  destination_masked: string;
  cooldown_seconds: number;
}

// Libellés d'affichage par canal — centralisés ici pour que
// pages/connexion.vue n'écrive jamais `if (channel === 'email') ... else
// if (channel === 'whatsapp') ...` dispersé dans le template (demande
// explicite du 27/08/2026, section 15).
//
// Révisé le 31/08/2026 (Nimba SMS + fallback email automatique côté backend,
// ordre de résolution whatsapp > sms > email) : l'envoi SMS (Nimba) est
// ASYNCHRONE — le backend peut répondre `sent: true, channel: "sms"` puis
// voir Nimba échouer juste après, auquel cas il bascule automatiquement vers
// un envoi email avec le même code (entièrement géré côté backend, jamais
// reproduit ici). `destinationLine` ne doit donc JAMAIS affirmer une
// livraison certaine pour un canal asynchrone (sms/whatsapp) — seul le canal
// PRIMAIRE TENTÉ est connu du front, jamais la livraison finale réelle.
// `email` reste la seule affirmation définitive possible : sa réponse HTTP
// signifie un envoi synchrone effectif, sans filet de secours derrière.
export interface OtpChannelPresentation {
  heading: string;
  destinationLine: (destinationMasked: string) => string;
  // Complément affiché sous la ligne de destination, uniquement pour les
  // canaux dont la livraison n'est pas garantie au moment de la réponse HTTP
  // (sms aujourd'hui, whatsapp par cohérence si un jour opérationnel) —
  // jamais présenté comme une erreur côté page, juste une information
  // rassurante sur le filet de sécurité déjà géré côté backend. `undefined`
  // pour un canal dont l'envoi est déjà garanti (email) : rien à rassurer.
  fallbackHint?: string;
}

// Formulation volontairement prudente pour sms/whatsapp — jamais "envoyé
// avec succès" ni "Code envoyé au ..." (affirmation que seul un canal
// synchrone peut se permettre) : le back a seulement TENTÉ ce canal.
const SMS_FALLBACK_HINT =
  "En cas de problème avec le SMS, le code peut être envoyé par email si une adresse est enregistrée sur votre compte.";

const OTP_CHANNEL_PRESENTATION: Record<OtpChannel, OtpChannelPresentation> = {
  email: {
    heading: "Vérifiez votre email",
    destinationLine: (destination) => `Code envoyé à ${destination}`,
  },
  sms: {
    heading: "Envoi de votre code par SMS",
    destinationLine: (destination) => `Nous envoyons votre code par SMS au ${destination}.`,
    fallbackHint: SMS_FALLBACK_HINT,
  },
  whatsapp: {
    heading: "Envoi de votre code par WhatsApp",
    destinationLine: (destination) => `Nous envoyons votre code par WhatsApp au ${destination}.`,
    fallbackHint: SMS_FALLBACK_HINT,
  },
};

// Repli neutre pour une valeur de `channel` future non encore connue ici
// (contrat traité comme un enum ouvert, jamais une simple comparaison à
// "email") — jamais une erreur d'affichage.
const OTP_CHANNEL_PRESENTATION_FALLBACK: OtpChannelPresentation = {
  heading: "Vérifiez votre code",
  destinationLine: (destination) => `Code envoyé à ${destination}`,
};

export function otpChannelPresentation(channel: OtpChannel): OtpChannelPresentation {
  return OTP_CHANNEL_PRESENTATION[channel] ?? OTP_CHANNEL_PRESENTATION_FALLBACK;
}

// Message générique pour tout ce que le contrat OTP n'habille pas déjà d'un
// texte pensé pour l'utilisateur (404/429/503 ont leur propre message dédié
// côté pages/connexion.vue ; 422 porte un message backend déjà destiné à
// l'utilisateur, ex. "Code incorrect ou expiré.") — réservé aux pannes 5xx et
// réseau (normalizeAuthError() replie déjà les deux sur status >= 500, voir
// plus bas), jamais une trace Laravel/Nimba brute affichée au client.
const OTP_GENERIC_ERROR_MESSAGE = "Impossible d'envoyer le code pour le moment. Réessayez dans quelques instants.";

export function otpFriendlyErrorMessage(info: AuthErrorInfo): string {
  return info.status >= 500 ? OTP_GENERIC_ERROR_MESSAGE : info.message;
}

export interface OtpVerifyInput {
  telephone: string;
  code: string;
}

export interface OtpVerifyPayload extends OtpVerifyInput {
  device_name: string;
}

export function buildOtpVerifyPayload(input: OtpVerifyInput): OtpVerifyPayload {
  return {
    telephone: input.telephone,
    code: input.code,
    device_name: DEVICE_NAME,
  };
}

// `user` : IssuesTelephoneLoginToken::userResource() est partagé mot pour mot
// avec LoginController (mot de passe) — même AuthUser, mêmes imperfections
// déjà documentées plus haut (email/is_active/qr_payload), jamais un second
// type dupliqué.
export interface OtpVerifyResponse {
  token: string;
  user: AuthUser;
}

export interface AuthErrorInfo {
  status: number;
  message: string;
  code?: string;
  fieldErrors?: Record<string, string>;
  // Présent uniquement sur un 429 (anti-spam OTP, HasOtpRateLimitResponse
  // côté backend — voir OtpLogin\RequestController) : délai exact avant de
  // pouvoir redemander un code, jamais une valeur devinée/codée en dur côté
  // Nuxt (voir composables/useOtpLogin.ts).
  retryAfterSeconds?: number;
}

interface AuthErrorPayload {
  message?: string;
  error?: string;
  code?: string;
  errors?: Record<string, string[] | string>;
  retry_after_seconds?: number;
  data?: AuthErrorPayload;
}

// Même déballage que getServerPayload() dans pages/inscription.vue et
// pages/mot-de-passe-oublie.vue : une erreur upstream (Laravel) traverse
// server/utils/monolithClient.ts via createError({data: upstreamData}), que
// Nitro sérialise à son tour dans un objet {..., data}. Le payload utile est
// donc à error.data.data quand c'est un handler server/api/auth/* qui a
// relayé l'erreur ainsi ; error.data directement sinon (erreur H3 "plate").
function unwrapAuthErrorPayload(error: IFetchError<AuthErrorPayload> | null | undefined): AuthErrorPayload {
  const outer = error?.data || {};
  return outer.data || outer;
}

export function normalizeAuthError(error: unknown): AuthErrorInfo {
  const fetchError = error as IFetchError<AuthErrorPayload>;
  const payload = unwrapAuthErrorPayload(fetchError);

  const fieldErrors: Record<string, string> | undefined = payload.errors
    ? Object.fromEntries(
        Object.entries(payload.errors).map(([field, messages]) => [
          field,
          Array.isArray(messages) ? String(messages[0] || "") : String(messages || ""),
        ]),
      )
    : undefined;

  return {
    status: Number(fetchError?.response?.status || fetchError?.statusCode || 500),
    message:
      payload.message ||
      payload.error ||
      fetchError?.statusMessage ||
      "Une erreur est survenue. Veuillez réessayer.",
    code: payload.code,
    fieldErrors,
    retryAfterSeconds: payload.retry_after_seconds,
  };
}

export function isAccountStatusCode(code: string | undefined): code is AccountStatusCode {
  return code === "pending_validation" || code === "account_blocked" || code === "email_not_verified";
}

// Même règle que registrationProxy.ts/passwordResetProxy.ts : priorité au
// paramètre serveur-only monolithApiBase, repli sur public.apiBase (identique
// en pratique, cf. config/runtime.ts, mais monolithApiBase reste le nom
// explicite pour un appel server-to-server).
export function resolveMonolithBaseUrl(config: {
  monolithApiBase?: string;
  public?: { apiBase?: string };
}): string {
  return String(config.monolithApiBase || config.public?.apiBase || "")
    .trim()
    .replace(/\/$/, "");
}

// Cookie de session Nuxt (voir server/utils/authSession.ts) : `Secure` dès
// que l'environnement n'est pas "local" (preprod/recette/production sont
// tous servis en HTTPS, cf. audit du 26/08/2026 section F) — plus précis
// qu'un simple check `import.meta.dev`, qui ne distingue pas un build de
// preprod d'un build de production.
export function shouldUseSecureCookies(environment: string): boolean {
  return environment !== "local";
}

// Rôles autorisés dans l'espace client Nuxt — même règle que le middleware
// Laravel `role:client|proprietaire|livreur` sur gains/mine, vehicules/mine,
// vehicules/{id}/commissions, vehicules/{id}/frais (voir
// docs/api-auth-contract.md côté elm-monolithe). LoginController/MeController
// ne font eux-mêmes AUCUNE vérification de rôle (partagés avec le mobile) :
// un compte staff/admin/super_admin obtient donc un token Sanctum valide
// comme n'importe qui. Cet espace n'étant pas l'application backoffice
// (Inertia, séparée), c'est au frontend de refuser explicitement une session
// pour un rôle qui n'a rien à y faire — voir composables/useAuth.ts::login()
// et middleware/auth.ts.
export const CLIENT_SPACE_ROLES = ["client", "proprietaire", "livreur"] as const;

export function hasClientSpaceAccess(roles: string[] | undefined | null): boolean {
  if (!roles || roles.length === 0) return false;
  const allowed: readonly string[] = CLIENT_SPACE_ROLES;
  return roles.some((role) => allowed.includes(role));
}

// Libellé d'affichage pour un compte cumulant plusieurs rôles (ex. carte
// d'identité mobile, pages/espace-client/index.vue) — même ordre de priorité
// que `profile.type` sur GET /v1/mobile/profile (proprietaire > client >
// livreur en cas de cumul, voir docs/api-espace-client-contract.md §0/§3
// côté elm-monolithe) : jamais roles[0], qui refléterait un ordre arbitraire
// côté base de données plutôt qu'une vraie priorité métier.
export function clientSpaceRoleLabel(roles: string[] | undefined | null): string {
  if (roles?.includes("proprietaire")) return "Propriétaire";
  if (roles?.includes("client")) return "Client";
  if (roles?.includes("livreur")) return "Livreur";
  return "Compte";
}
