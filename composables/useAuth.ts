import type { AuthContext, AuthErrorInfo, AuthUser, LoginInput, OtpVerifyInput } from "~/config/auth";
import { buildOtpVerifyPayload, hasClientSpaceAccess, normalizeAuthError } from "~/config/auth";

// État d'authentification partagé (useState = singleton réactif par clé,
// hydraté du serveur vers le client sans re-fetch — voir ensureFetched() plus
// bas). Ne contient jamais le token Sanctum : celui-ci reste scellé dans le
// cookie de session Nuxt (server/utils/authSession.ts), inaccessible au
// JavaScript navigateur.
type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface MeResponse extends AuthUser {
  context: AuthContext;
}

interface LoginResponse {
  user: AuthUser;
}

export type LoginResult = { ok: true } | { ok: false; error: AuthErrorInfo };

// Code synthétique, décidé et calculé CÔTÉ FRONTEND (voir config/auth.ts::
// hasClientSpaceAccess) : /api/auth/login et /api/auth/me ne renvoient
// aujourd'hui aucun code de ce type (aucune vérification de rôle côté
// backend sur ces endpoints — voir docs/api-auth-contract.md). Nommé
// `client_access_denied` par anticipation d'un futur contrat backend dédié
// (endpoint de login espace client), pas parce qu'il existe déjà : si ce
// contrat est livré un jour avec son propre code, aligner cette valeur dessus
// plutôt que la deviner à l'avance.
const CLIENT_ACCESS_DENIED_CODE = "client_access_denied";

export function useAuth() {
  const user = useState<AuthUser | null>("auth:user", () => null);
  const context = useState<AuthContext | null>("auth:context", () => null);
  const status = useState<AuthStatus>("auth:status", () => "idle");
  const lastError = useState<AuthErrorInfo | null>("auth:lastError", () => null);

  // useRequestFetch() (Nuxt, pas ofetch brut) : nécessaire pour appeler nos
  // propres routes BFF (chemins relatifs "/api/auth/...") depuis un
  // middleware qui s'exécute aussi côté SSR (middleware/auth.ts,
  // middleware/guest.ts, sur toute navigation "dure" — page.goto() direct,
  // F5...). Un ofetch importé brut n'a pas d'URL de base côté serveur (Node
  // ne sait pas résoudre un chemin relatif sans document/origine) et échoue
  // avec "Failed to parse URL from /api/auth/me" ; useRequestFetch() résout
  // en plus vers CE serveur Nuxt et transmet le cookie de session entrant
  // (indispensable pour que server/api/auth/me.get.ts retrouve le token
  // scellé). Côté client, useRequestFetch() renvoie simplement le $fetch
  // habituel : aucun comportement différent pour les appels déclenchés après
  // hydratation (ex. clic sur "Se connecter").
  const requestFetch = useRequestFetch();
  const { reset: resetNotifications } = useClientNotifications();

  const isAuthenticated = computed(() => status.value === "authenticated");
  const hasClientAccess = computed(() => hasClientSpaceAccess(user.value?.roles));

  function applyMe(data: MeResponse) {
    const { context: ctx, ...rest } = data;
    user.value = rest;
    context.value = ctx;
    status.value = "authenticated";
  }

  // resetNotifications() ici (pas seulement dans logout()) : clear() est le
  // SEUL chemin qui s'exécute à coup sûr sur toute perte de session, y
  // compris un /api/auth/me qui échoue en 401 pendant refreshMe() (F5 avec un
  // cookie expiré) — aucune notification du compte précédent ne doit rester
  // visible avant la prochaine connexion (demande du 28/08/2026, section 23).
  function clear() {
    user.value = null;
    context.value = null;
    status.value = "unauthenticated";
    resetNotifications();
  }

  // GET /api/auth/me (BFF) — seule source de vérité pour restaurer une
  // session après F5/navigation directe/SSR (voir docs/api-auth-contract.md
  // côté elm-monolithe, section "context") : jamais déduit d'un état Vue en
  // mémoire seul.
  async function refreshMe(): Promise<boolean> {
    status.value = "loading";
    try {
      const data = await requestFetch<MeResponse>("/api/auth/me");
      applyMe(data);
      return true;
    } catch (error) {
      lastError.value = normalizeAuthError(error);
      clear();
      return false;
    }
  }

  // Idempotent : à appeler depuis un garde de route (middleware/auth.ts,
  // middleware/guest.ts) sans provoquer un appel réseau à chaque navigation
  // une fois le statut déjà connu pour ce cycle serveur/client.
  async function ensureFetched(): Promise<void> {
    if (status.value === "idle") {
      await refreshMe();
    }
  }

  async function logout(): Promise<void> {
    try {
      await requestFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Le nettoyage local a lieu quoi qu'il arrive (voir clear() plus bas) :
      // mieux vaut un utilisateur "trop" déconnecté côté Nuxt qu'une session
      // qui semble valide alors que l'appel de révocation a échoué. Aucun
      // dev-bypass ici : server/api/auth/logout.post.ts ne contacte Laravel
      // que s'il existe un token en session, donc cet appel reste un
      // aller-retour purement local (rapide, jamais bloquant) tant qu'aucune
      // vraie connexion n'a eu lieu — voir tests/e2e/profil.spec.ts.
    }
    clear();
  }

  async function logoutAll(): Promise<void> {
    try {
      await requestFetch("/api/auth/logout-all", { method: "POST" });
    } catch {
      // Idem logout().
    }
    clear();
  }

  // Étapes post-authentification communes à TOUT moyen de preuve accepté par
  // ce front (mot de passe aujourd'hui, OTP depuis le 27/08/2026) : posées
  // ici une seule fois pour que login() et loginWithOtp() convergent
  // EXACTEMENT vers le même mécanisme (demande explicite du chantier OTP —
  // jamais un second système d'authentification Nuxt en parallèle).
  async function completeLogin(loginUser: AuthUser): Promise<LoginResult> {
    user.value = loginUser;
    status.value = "authenticated";

    // La réponse de login/otp-verify ne porte pas `context` (voir
    // LoginController/OtpLogin\VerifyController côté backend) : /me la
    // complète immédiatement pour ne jamais la laisser désynchronisée de
    // `user`. Ne PAS utiliser refreshMe() ici : celui-ci fait clear() sur
    // échec (correct pour restaurer une session après F5, où l'on ne sait
    // justement rien) — ici la connexion vient de réussir, donc un /me qui
    // échoue ensuite (blip réseau...) ne doit jamais faire perdre l'état
    // authentifié qui vient d'être établi. `context` reste simplement absent
    // dans ce cas.
    try {
      const me = await requestFetch<MeResponse>("/api/auth/me");
      applyMe(me);
    } catch {
      // user/status restent ceux posés ci-dessus.
    }

    // LoginController/OtpLogin\VerifyController/MeController ne vérifient
    // AUCUN rôle côté backend (partagés avec le mobile) : un compte
    // staff/admin/super_admin obtient un token Sanctum valide comme
    // n'importe qui, quel que soit le moyen de preuve. Cet espace n'est pas
    // l'application backoffice (Inertia, séparée) — refus explicite ici,
    // avec révocation immédiate du token qui vient d'être émis (pas de
    // session qui traîne pour un rôle qui n'a rien à faire dans cette app).
    //
    // hasClientSpaceAccess() est un OR sur les rôles présents (voir
    // config/auth.ts) : un compte cumulant un rôle staff ET un rôle
    // client/proprietaire/livreur (ex. admin_entreprise + proprietaire,
    // supporté côté backend depuis le 26/08/2026 — App\Models\User::
    // hasBackofficeAccess()/hasClientAccess()) est bien accepté ici. Ne
    // JAMAIS transformer ceci en vérification exclusive ("roles.length===1"
    // ou "roles[0] === 'client'") : les rôles sont cumulables, un rôle
    // staff supplémentaire ne retire jamais l'accès espace client.
    if (!hasClientSpaceAccess(user.value?.roles)) {
      await logout();
      const info: AuthErrorInfo = {
        status: 403,
        message: "Ce compte n'a pas accès à l'espace client.",
        code: CLIENT_ACCESS_DENIED_CODE,
      };
      lastError.value = info;
      return { ok: false, error: info };
    }

    return { ok: true };
  }

  async function login(input: LoginInput): Promise<LoginResult> {
    status.value = "loading";
    lastError.value = null;
    try {
      const data = await requestFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: input,
      });
      return await completeLogin(data.user);
    } catch (error) {
      const info = normalizeAuthError(error);
      lastError.value = info;
      clear();
      return { ok: false, error: info };
    }
  }

  // Étape 2 de la connexion OTP (composables/useOtpLogin.ts gère l'étape 1,
  // la demande de code) — POST /api/auth/otp-login/verify (BFF) renvoie
  // EXACTEMENT la même forme que POST /api/auth/login ({token, user}, voir
  // config/auth.ts::OtpVerifyResponse), d'où la convergence vers
  // completeLogin() ci-dessus plutôt qu'une logique dupliquée.
  async function loginWithOtp(input: OtpVerifyInput): Promise<LoginResult> {
    status.value = "loading";
    lastError.value = null;
    try {
      const data = await requestFetch<LoginResponse>("/api/auth/otp-login/verify", {
        method: "POST",
        body: buildOtpVerifyPayload(input),
      });
      return await completeLogin(data.user);
    } catch (error) {
      const info = normalizeAuthError(error);
      lastError.value = info;
      clear();
      return { ok: false, error: info };
    }
  }

  return {
    user,
    context,
    status,
    lastError,
    isAuthenticated,
    hasClientAccess,
    ensureFetched,
    refreshMe,
    login,
    loginWithOtp,
    logout,
    logoutAll,
  };
}
