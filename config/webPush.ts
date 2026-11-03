// Web Push PWA (3ᵉ canal de notifications, chantier backend du 28/08/2026 —
// voir docs/api-espace-client-contract.md §7.4 côté elm-monolithe et
// docs/pwa.md ici). Logique pure uniquement (aucun accès direct à
// window/navigator/Notification ici) — testable sans DOM, même convention que
// config/clientNotifications.ts/config/auth.ts. Les accès navigateur réels
// vivent dans composables/useWebPush.ts, qui appelle ces fonctions.

// ── État agrégé (state machine) ─────────────────────────────────────────────
// Un enum fermé plutôt qu'une accumulation de booléens contradictoires
// (demande explicite du chantier, section 6) : chaque état correspond à un
// unique libellé/CTA côté UI (voir pages/espace-client/profil.vue).
export type WebPushState =
  | "unsupported" // navigateur sans Service Worker/PushManager/Notification
  | "requires_install" // iOS/iPadOS Safari, app pas encore ajoutée à l'écran d'accueil
  | "unavailable_server" // vapid-public-key renvoie null (serveur pas configuré)
  | "permission_denied" // Notification.permission === "denied"
  | "subscribed" // abonnement PushManager existant ET synchronisé au backend
  | "not_subscribed"; // supporté, disponible, permission accordée ou pas encore demandée

export interface WebPushCapabilities {
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
}

export function isWebPushSupported(capabilities: WebPushCapabilities): boolean {
  return capabilities.hasServiceWorker && capabilities.hasPushManager && capabilities.hasNotification;
}

export interface WebPushStateInput {
  capabilities: WebPushCapabilities;
  vapidPublicKey: string | null;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  // iOS/iPadOS Safari, PWA PAS installée sur l'écran d'accueil (section 26) :
  // sur cette plateforme, `capabilities` est de toute façon déjà à `false`
  // tant que l'app n'est pas installée (Safari n'expose PushManager qu'en
  // mode standalone) — ce indicateur permet de distinguer "jamais supporté"
  // de "supporté une fois installé", pour afficher le bon message (section
  // 26-27) plutôt qu'un "non disponible" générique et trompeur.
  isIosSafariNotStandalone: boolean;
}

export function resolveWebPushState(input: WebPushStateInput): WebPushState {
  if (input.isIosSafariNotStandalone) return "requires_install";
  if (!isWebPushSupported(input.capabilities)) return "unsupported";
  if (!input.vapidPublicKey) return "unavailable_server";
  if (input.permission === "denied") return "permission_denied";
  if (input.isSubscribed) return "subscribed";
  return "not_subscribed";
}

// ── Détection plateforme (iOS / mode standalone) ────────────────────────────
// Paramètres injectés (userAgent, maxTouchPoints) plutôt que lus directement
// ici : garde ce module testable sans DOM (voir composables/useWebPush.ts
// pour les appels réels à navigator.*).
export function isIosDevice(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPad|iPhone|iPod/i.test(userAgent)) return true;
  // iPadOS 13+ : Safari annonce un user-agent "Macintosh" (UA desktop),
  // seul le nombre de points tactiles le distingue d'un vrai Mac.
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1;
}

export function isStandaloneDisplay(matchesStandaloneMedia: boolean, iosNavigatorStandalone: boolean | undefined): boolean {
  return matchesStandaloneMedia || iosNavigatorStandalone === true;
}

// ── Conversion clé VAPID (base64url -> Uint8Array) ──────────────────────────
// PushManager.subscribe({ applicationServerKey }) exige un Uint8Array/BufferSource,
// jamais la chaîne base64url renvoyée par le backend (voir
// WebPushSubscriptionsController::vapidPublicKey côté elm-monolithe).
export function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

// ── Payload envoyé au BFF (POST /api/client/web-push/subscriptions) ────────
// Forme exacte attendue par WebPushSubscriptionStoreRequest côté backend —
// voir types/api.ts::ApiWebPushSubscribeRequestBody (généré depuis l'OpenAPI
// synchronisé le 28/08/2026).
export interface WebPushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// Type structurel minimal (pas le DOM lib global PushSubscription) : ce
// module reste testable sans DOM, un simple objet `{ endpoint, toJSON }`
// suffit en test.
interface PushSubscriptionLike {
  endpoint: string;
  toJSON: () => { keys?: { p256dh?: string; auth?: string } };
}

// `null` si l'abonnement navigateur n'a pas (encore) ses clés de chiffrement
// (ne devrait pas arriver en pratique une fois PushManager.subscribe()
// résolu, mais un abonnement corrompu/partiel ne doit jamais être envoyé tel
// quel au backend, qui le rejetterait de toute façon en 422).
export function buildSubscriptionPayload(subscription: PushSubscriptionLike): WebPushSubscriptionPayload | null {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!p256dh || !auth) return null;
  return { endpoint: subscription.endpoint, keys: { p256dh, auth } };
}

// ── Payload reçu par le Service Worker (événement `push`) ──────────────────
// Forme RÉELLE confirmée dans le code backend (DispatchPushNotificationsJob,
// WebPushService::sendToUser) : `{title, body, ...data}` APLATI — jamais
// `{title, body, data: {...}}` imbriqué (ambiguïté du rapport backend levée
// en lisant app/Jobs/DispatchPushNotificationsJob.php directement, chantier
// du 28/08/2026). `type`/`commande_id`/`transfert_id` sont donc des clés de
// premier niveau, au même titre que title/body.
export interface WebPushNotificationPayload {
  title: string;
  body: string;
  type?: string;
  [key: string]: unknown;
}

const DEFAULT_TITLE = "Eau La Maman";
const DEFAULT_BODY = "Vous avez une nouvelle notification.";

// Défensif par construction (section 38) : un payload absent/invalide/partiel
// ne doit jamais faire planter le Service Worker, seulement retomber sur un
// titre/corps générique raisonnable.
export function parseWebPushPayload(raw: unknown): WebPushNotificationPayload {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    ...data,
    title: typeof data.title === "string" && data.title ? data.title : DEFAULT_TITLE,
    body: typeof data.body === "string" && data.body ? data.body : DEFAULT_BODY,
  };
}

// ── Résolution de route au clic (notificationclick) ─────────────────────────
export interface WebPushNavigationTarget {
  path: string;
  query?: Record<string, string>;
}

// Aucune route inventée (section 15) : sans correspondance connue, on ouvre
// l'écran des notifications de l'espace client plutôt qu'une page métier qui
// n'existe pas.
const FALLBACK_TARGET: WebPushNavigationTarget = { path: "/espace-client/notifications" };

// Couverture backend actuelle limitée à 2 événements sur 7 (commande validée,
// transfert créé — voir docs/api-espace-client-contract.md §7.4). Seule
// "commande_vente_validee" porte une destination connue côté Nuxt
// aujourd'hui : même chemin/clé de requête que
// notificationResourceToRoute() (config/clientNotifications.ts,
// resource.type === "commande_vente") — vocabulaire différent (type
// d'ÉVÉNEMENT push vs type de RESSOURCE database) mais même écran réel. Pas
// de route connue pour "transfert_created" (aucune page
// pages/espace-client/livraisons-transferts/* n'existe côté Nuxt) : repli sur
// FALLBACK_TARGET, jamais une route fabriquée.
//
// IMPORTANT : public/push-sw.js (script classique, jamais bundlé par Vite —
// voir nuxt.config.ts pwa.workbox.importScripts) ne peut pas importer ce
// module TypeScript et maintient sa propre copie minimale de ce mapping.
// Toute modification ici doit être répercutée là-bas (et inversement).
export function webPushNotificationRoute(payload: WebPushNotificationPayload): WebPushNavigationTarget {
  if (payload.type === "commande_vente_validee" && typeof payload.commande_id === "string" && payload.commande_id) {
    return { path: "/espace-client/activite", query: { commande: payload.commande_id } };
  }
  return FALLBACK_TARGET;
}

// ── Présentation UI par état (pages/espace-client/profil.vue) ──────────────
// Même principe que otpChannelPresentation() (config/auth.ts) : centralise
// les libellés ici plutôt que des `if (state === ...) ... else if ...`
// dispersés dans le template (section 36 — libellés courts, cohérents avec
// l'UI ELM). Ce réglage représente CET appareil/navigateur, jamais une
// préférence globale du compte (section 19-20) — texte volontairement
// explicite là-dessus dans chaque description.
export interface WebPushStatePresentation {
  label: string;
  description: string;
}

const WEBPUSH_STATE_PRESENTATION: Record<WebPushState, WebPushStatePresentation> = {
  unsupported: {
    label: "Non disponible",
    description: "Ce navigateur ne prend pas en charge les notifications push.",
  },
  requires_install: {
    label: "Installer l'application d'abord",
    description: "Ajoutez Eau La Maman à votre écran d'accueil (icône Partager puis « Sur l'écran d'accueil »), puis revenez sur cette page.",
  },
  unavailable_server: {
    label: "Non disponible",
    description: "Ce canal n'est pas encore configuré.",
  },
  permission_denied: {
    label: "Bloquées par le navigateur",
    description: "Les notifications sont bloquées dans les réglages de votre navigateur pour ce site.",
  },
  subscribed: {
    label: "Activées",
    description: "Vous recevez les alertes sur cet appareil, même application fermée.",
  },
  not_subscribed: {
    label: "Désactivées",
    description: "Recevez vos commandes et livraisons même lorsque l'application est fermée.",
  },
};

export function webPushStatePresentation(state: WebPushState): WebPushStatePresentation {
  return WEBPUSH_STATE_PRESENTATION[state];
}
