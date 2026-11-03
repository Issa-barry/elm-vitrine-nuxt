// Enregistre le service worker sans jamais recharger la page (voir docs/pwa.md
// § mise à jour). Remplace le plugin de @vite-pwa/nuxt (client.registerPlugin:
// false dans nuxt.config.ts), qui recharge sans condition à l'activation d'un
// nouveau service worker. Pas de service worker en `nuxt dev`
// (pwa.devOptions.enabled: false) : rien à enregistrer.
export default defineNuxtPlugin(() => {
  if (import.meta.dev || !("serviceWorker" in navigator)) return;

  const { baseURL } = useRuntimeConfig().app;
  navigator.serviceWorker.register(`${baseURL}sw.js`, { scope: baseURL }).catch((error) => {
    console.error("Enregistrement du service worker impossible", error);
  });
});
