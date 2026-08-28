import type { AuthErrorInfo } from "~/config/auth";
import { normalizeAuthError } from "~/config/auth";
import type { WebPushCapabilities, WebPushState } from "~/config/webPush";
import { buildSubscriptionPayload, isIosDevice, isStandaloneDisplay, isWebPushSupported, resolveWebPushState, urlBase64ToUint8Array } from "~/config/webPush";
import type { ApiWebPushSubscribeResponse, ApiWebPushVapidPublicKeyResponse } from "~/types/api";

type WebPushResult = { ok: true } | { ok: false; error: AuthErrorInfo };

const UNSUPPORTED_ERROR: AuthErrorInfo = { status: 0, message: "Les notifications ne sont pas prises en charge par ce navigateur." };
const UNAVAILABLE_SERVER_ERROR: AuthErrorInfo = { status: 503, message: "Notifications indisponibles pour le moment." };
const PERMISSION_DENIED_ERROR: AuthErrorInfo = { status: 0, message: "Permission de notification refusée par le navigateur." };
const SYNC_ERROR: AuthErrorInfo = { status: 0, message: "Erreur de synchronisation." };

// Web Push (3ᵉ canal, chantier du 28/08/2026) — encapsule TOUT accès direct à
// PushManager/Notification/navigator.serviceWorker, pour que les composants
// Vue (pages/espace-client/profil.vue) ne manipulent jamais ces API
// directement (demande explicite section 5). Logique pure déportée dans
// config/webPush.ts (testée sans DOM) ; ce composable ne fait que la relier
// aux vraies API navigateur et au BFF (server/api/client/web-push/*).
//
// Ne contient AUCUNE logique de destinataire/rôle : le backend décide seul
// qui reçoit quoi (NotificationDispatcher côté elm-monolithe) — ce
// composable ne fait qu'activer/désactiver le canal pour CET
// appareil/navigateur.
export function useWebPush() {
  const vapidPublicKey = useState<string | null>("webpush:vapidPublicKey", () => null);
  const permission = useState<NotificationPermission | "unsupported">("webpush:permission", () => "default");
  const isSubscribed = useState<boolean>("webpush:isSubscribed", () => false);
  const isLoading = useState<boolean>("webpush:isLoading", () => false);
  const error = useState<AuthErrorInfo | null>("webpush:error", () => null);
  const hasInitialized = useState<boolean>("webpush:hasInitialized", () => false);
  // SSR : `navigator`/`window` n'existent pas -> capabilities() renvoie tout
  // à `false`. Sans cette garde, la PREMIÈRE passe de rendu client (avant
  // que Vue n'ait fini l'hydratation) lirait déjà le vrai `navigator` et
  // calculerait un état différent de celui rendu par le serveur -> mismatch
  // d'hydratation Vue (texte qui changerait sous les yeux + warning
  // console). `isReady` reste `false` tant qu'aucune action (initialize/
  // subscribe/unsubscribe) n'a réellement démarré côté client — ces actions
  // ne sont déclenchées que depuis onMounted()/un clic, donc toujours APRÈS
  // que l'hydratation initiale (identique au SSR) soit déjà commise.
  const isReady = useState<boolean>("webpush:isReady", () => false);

  const requestFetch = useRequestFetch();

  function capabilities(): WebPushCapabilities {
    if (!isReady.value) return { hasServiceWorker: false, hasPushManager: false, hasNotification: false };
    return {
      hasServiceWorker: typeof navigator !== "undefined" && "serviceWorker" in navigator,
      hasPushManager: typeof window !== "undefined" && "PushManager" in window,
      hasNotification: typeof window !== "undefined" && "Notification" in window,
    };
  }

  const isSupported = computed(() => isWebPushSupported(capabilities()));

  function isIosSafariNotStandalone(): boolean {
    if (!isReady.value || typeof navigator === "undefined" || typeof window === "undefined") return false;
    const ios = isIosDevice(navigator.userAgent, navigator.maxTouchPoints || 0);
    if (!ios) return false;
    const matchesStandaloneMedia = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
    const iosNavigatorStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
    return !isStandaloneDisplay(matchesStandaloneMedia, iosNavigatorStandalone);
  }

  const state = computed<WebPushState>(() =>
    resolveWebPushState({
      capabilities: capabilities(),
      vapidPublicKey: vapidPublicKey.value,
      permission: permission.value,
      isSubscribed: isSubscribed.value,
      isIosSafariNotStandalone: isIosSafariNotStandalone(),
    }),
  );

  function readBrowserPermission(): void {
    permission.value = typeof Notification !== "undefined" ? Notification.permission : "unsupported";
  }

  async function readExistingSubscription(): Promise<PushSubscription | null> {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  }

  async function fetchVapidPublicKey(): Promise<void> {
    try {
      const data = await requestFetch<ApiWebPushVapidPublicKeyResponse>("/api/client/web-push/vapid-public-key");
      vapidPublicKey.value = data.public_key;
    } catch {
      // Best-effort : une erreur réseau ponctuelle laisse simplement le canal
      // indisponible (état unavailable_server), jamais une exception qui
      // remonterait jusqu'à la page Profil.
      vapidPublicKey.value = null;
    }
  }

  async function postSubscription(subscription: PushSubscription): Promise<boolean> {
    const payload = buildSubscriptionPayload(subscription);
    if (!payload) return false;
    await requestFetch<ApiWebPushSubscribeResponse>("/api/client/web-push/subscriptions", {
      method: "POST",
      body: payload,
    });
    return true;
  }

  async function deleteServerAssociation(endpoint: string): Promise<void> {
    await requestFetch("/api/client/web-push/subscriptions", { method: "DELETE", query: { endpoint } });
  }

  // Resynchronisation SILENCIEUSE (section 21-22) : n'envoie au backend QUE
  // s'il existe déjà un abonnement navigateur (créé par un subscribe()
  // explicite précédent) — ne déclenche jamais de prompt de permission.
  // Safe à appeler à chaque connexion (POST idempotent côté backend) :
  // reconnexion, données backend réinitialisées, changement de compte sur le
  // même navigateur (section 24) — le backend réassigne l'endpoint au
  // dernier User authentifié.
  async function syncSubscription(): Promise<WebPushResult> {
    // Toujours appelée depuis un contexte client réel (initialize() depuis
    // onMounted, ou useAuth.ts::completeLogin() déclenché par un clic) —
    // jamais pendant le SSR : voir le commentaire sur `isReady` plus haut.
    isReady.value = true;
    try {
      if (!isSupported.value) return { ok: true };
      const subscription = await readExistingSubscription();
      if (!subscription) {
        isSubscribed.value = false;
        return { ok: true };
      }
      const sent = await postSubscription(subscription);
      isSubscribed.value = sent;
      return sent ? { ok: true } : { ok: false, error: SYNC_ERROR };
    } catch (fetchError) {
      // Silencieux par nature (section 34 : un resync en arrière-plan ne
      // spamme jamais l'utilisateur) — pas d'écriture dans `error`, l'appelant
      // (useAuth.ts) ignore volontairement le résultat.
      return { ok: false, error: normalizeAuthError(fetchError) };
    }
  }

  // Initialise l'état affiché (Profil) SANS jamais déclencher de prompt
  // navigateur (section 17) : lecture seule de la permission déjà
  // accordée/refusée et de l'abonnement déjà existant, plus resync
  // silencieuse si un abonnement est trouvé. Idempotent par onglet (useState).
  async function initialize(): Promise<void> {
    isReady.value = true;
    if (hasInitialized.value) return;
    hasInitialized.value = true;

    if (!isSupported.value) return;

    readBrowserPermission();
    await fetchVapidPublicKey();

    if (permission.value !== "granted") return;

    await syncSubscription();
  }

  // SEULE fonction qui peut déclencher Notification.requestPermission() —
  // jamais appelée automatiquement, uniquement depuis le clic explicite du
  // bouton "Activer les notifications" (section 17-18).
  async function subscribe(): Promise<WebPushResult> {
    isReady.value = true;
    error.value = null;
    isLoading.value = true;
    try {
      if (!isSupported.value) {
        error.value = UNSUPPORTED_ERROR;
        return { ok: false, error: UNSUPPORTED_ERROR };
      }

      if (!vapidPublicKey.value) {
        await fetchVapidPublicKey();
      }
      if (!vapidPublicKey.value) {
        error.value = UNAVAILABLE_SERVER_ERROR;
        return { ok: false, error: UNAVAILABLE_SERVER_ERROR };
      }

      permission.value = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;

      if (permission.value !== "granted") {
        error.value = PERMISSION_DENIED_ERROR;
        return { ok: false, error: PERMISSION_DENIED_ERROR };
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey.value) as BufferSource,
        }));

      const sent = await postSubscription(subscription);
      isSubscribed.value = sent;
      if (!sent) {
        error.value = SYNC_ERROR;
        return { ok: false, error: SYNC_ERROR };
      }
      return { ok: true };
    } catch (subscribeError) {
      const info = normalizeAuthError(subscribeError);
      error.value = info;
      return { ok: false, error: info };
    } finally {
      isLoading.value = false;
    }
  }

  // Désactivation EXPLICITE (toggle "Notifications sur cet appareil"
  // décoché, section 23) : supprime l'association serveur ET l'abonnement
  // navigateur lui-même. Distinct de unlinkFromAccount() (logout), qui ne
  // touche jamais l'abonnement navigateur.
  async function unsubscribe(): Promise<WebPushResult> {
    isReady.value = true;
    error.value = null;
    isLoading.value = true;
    try {
      const subscription = await readExistingSubscription();
      if (subscription) {
        await deleteServerAssociation(subscription.endpoint);
        await subscription.unsubscribe();
      }
      isSubscribed.value = false;
      return { ok: true };
    } catch (unsubscribeError) {
      const info = normalizeAuthError(unsubscribeError);
      error.value = info;
      return { ok: false, error: info };
    } finally {
      isLoading.value = false;
    }
  }

  // Logout/perte de session (section 23-24) : supprime UNIQUEMENT
  // l'association serveur de cet endpoint — jamais
  // subscription.unsubscribe(). L'abonnement navigateur reste utilisable ;
  // une connexion suivante (même compte ou un autre, section 24) le
  // resynchronise via syncSubscription(). Best-effort, silencieux : un
  // logout ne doit jamais échouer à cause du Web Push (voir
  // composables/useAuth.ts::clear()).
  async function unlinkFromAccount(): Promise<void> {
    try {
      if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) return;
      await deleteServerAssociation(subscription.endpoint);
    } catch {
      // Best-effort, voir commentaire ci-dessus.
    } finally {
      isSubscribed.value = false;
    }
  }

  return {
    state,
    isSupported,
    vapidPublicKey,
    permission,
    isSubscribed,
    isLoading,
    error,
    initialize,
    subscribe,
    unsubscribe,
    syncSubscription,
    unlinkFromAccount,
  };
}
