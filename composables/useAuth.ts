import { $fetch as rawFetch } from "ofetch";
import type { AuthContext, AuthErrorInfo, AuthUser, LoginInput } from "~/config/auth";
import { hasClientSpaceAccess, normalizeAuthError } from "~/config/auth";

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

  const isAuthenticated = computed(() => status.value === "authenticated");
  const hasClientAccess = computed(() => hasClientSpaceAccess(user.value?.roles));

  function applyMe(data: MeResponse) {
    const { context: ctx, ...rest } = data;
    user.value = rest;
    context.value = ctx;
    status.value = "authenticated";
  }

  function clear() {
    user.value = null;
    context.value = null;
    status.value = "unauthenticated";
  }

  // GET /api/auth/me (BFF) — seule source de vérité pour restaurer une
  // session après F5/navigation directe/SSR (voir docs/api-auth-contract.md
  // côté elm-monolithe, section "context") : jamais déduit d'un état Vue en
  // mémoire seul.
  async function refreshMe(): Promise<boolean> {
    status.value = "loading";
    try {
      const data = await rawFetch<MeResponse>("/api/auth/me");
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
      await rawFetch("/api/auth/logout", { method: "POST" });
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
      await rawFetch("/api/auth/logout-all", { method: "POST" });
    } catch {
      // Idem logout().
    }
    clear();
  }

  async function login(input: LoginInput): Promise<LoginResult> {
    status.value = "loading";
    lastError.value = null;
    try {
      const data = await rawFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: input,
      });
      user.value = data.user;
      status.value = "authenticated";

      // La réponse de login ne porte pas `context` (voir LoginController côté
      // backend) : /me la complète immédiatement pour ne jamais la laisser
      // désynchronisée de `user`. Ne PAS utiliser refreshMe() ici : celui-ci
      // fait clear() sur échec (correct pour restaurer une session après F5,
      // où l'on ne sait justement rien) — ici le login vient de réussir,
      // donc un /me qui échoue ensuite (blip réseau...) ne doit jamais faire
      // perdre l'état authentifié qui vient d'être établi. `context` reste
      // simplement absent dans ce cas.
      try {
        const me = await rawFetch<MeResponse>("/api/auth/me");
        applyMe(me);
      } catch {
        // user/status restent ceux posés par le login ci-dessus.
      }

      // LoginController/MeController ne vérifient AUCUN rôle côté backend
      // (partagés avec le mobile) : un compte staff/admin/super_admin obtient
      // un token Sanctum valide comme n'importe qui. Cet espace n'est pas
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
    logout,
    logoutAll,
  };
}
