// Ajout Web Push au service worker généré par Workbox (@vite-pwa/nuxt,
// stratégie generateSW — voir nuxt.config.ts, pwa.workbox.importScripts, et
// docs/pwa.md § Web Push). Chargé via importScripts() DANS le service worker
// généré : même `self`, même scope, UN SEUL service worker au total — jamais
// un second SW concurrent enregistré pour "/" (voir chantier du 28/08/2026,
// section 9).
//
// Script CLASSIQUE volontairement (pas un module ES) : importScripts() ne
// charge que du JavaScript non-module. Impossible d'importer
// config/webPush.ts (TypeScript, jamais bundlé pour ce fichier — passer par
// injectManifest aurait été nécessaire pour ça, migration explicitement
// écartée pour ce seul besoin). Le mapping type -> route ci-dessous DOIT donc
// rester synchronisé à la main avec webPushNotificationRoute() dans
// config/webPush.ts.

// Aucune route inventée (voir config/webPush.ts) : sans correspondance
// connue, on ouvre l'écran des notifications de l'espace client.
var WEBPUSH_FALLBACK_PATH = "/espace-client/notifications";

function webPushResolveTargetPath(payload) {
  if (payload && payload.type === "commande_vente_validee" && typeof payload.commande_id === "string" && payload.commande_id) {
    return "/espace-client/activite?commande=" + encodeURIComponent(payload.commande_id);
  }
  return WEBPUSH_FALLBACK_PATH;
}

self.addEventListener("push", function (event) {
  // Défensif par construction (payload absent/invalide/partiel ne doit
  // jamais faire planter le service worker) : un JSON.parse qui échoue
  // retombe simplement sur un titre/corps générique.
  var payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = {};
  }

  var title = typeof payload.title === "string" && payload.title ? payload.title : "Eau La Maman";
  var body = typeof payload.body === "string" && payload.body ? payload.body : "Vous avez une nouvelle notification.";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: "/icons/pwa-192x192.png",
      // Pas de `badge` : aucun asset monochrome dédié dans public/icons/ (voir
      // docs/pwa.md § Icônes) — réutiliser l'icône couleur pleine pour ce rôle
      // rendrait mal sur Android plutôt que de servir à quelque chose.
      data: { url: webPushResolveTargetPath(payload) },
    }),
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  var targetPath = (event.notification.data && event.notification.data.url) || WEBPUSH_FALLBACK_PATH;
  var targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url === targetUrl && "focus" in clientList[i]) {
          return clientList[i].focus();
        }
      }

      var sameOriginClient = null;
      for (var j = 0; j < clientList.length; j++) {
        if (new URL(clientList[j].url).origin === self.location.origin) {
          sameOriginClient = clientList[j];
          break;
        }
      }

      if (sameOriginClient) {
        if ("navigate" in sameOriginClient && "focus" in sameOriginClient) {
          return sameOriginClient.navigate(targetUrl).then(function (navigated) {
            return navigated && navigated.focus();
          });
        }
        return sameOriginClient.focus();
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});
