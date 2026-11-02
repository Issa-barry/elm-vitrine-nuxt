import { isIosDevice, isStandaloneDisplay } from "~/config/webPush";
import type { PwaInstallState } from "~/config/pwaInstall";
import { resolvePwaInstallState } from "~/config/pwaInstall";

// Pas de typage DOM standard pour cet événement (absent de WindowEventMap) :
// TypeScript retombe sur la surcharge générique addEventListener(type:
// string, ...), donc ce cast reste nécessaire, pas de lib.dom augmentée.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// Référence brute à l'événement natif : jamais dans useState (non
// sérialisable au payload SSR, et de toute façon 100 % client-only —
// `beforeinstallprompt` ne se déclenche jamais pendant le SSR). Singleton
// module plutôt que par composant : une seule invite possible par page, le
// listener n'a besoin d'être enregistré qu'une fois.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listenerRegistered = false;

// Bouton "Installer l'application" (landing) — même convention que
// composables/useWebPush.ts : logique pure dans config/pwaInstall.ts, ce
// composable ne fait que la relier aux vraies API navigateur/PWA.
export function usePwaInstall() {
  // Garde SSR (même rôle que useWebPush.ts::isReady) : ne passe à true
  // qu'après un vrai montage client, jamais pendant l'hydratation initiale —
  // évite un état "installable" calculé côté serveur qui ne correspondrait à
  // rien puis changerait sous les yeux au premier rendu client.
  const isReady = useState<boolean>("pwaInstall:isReady", () => false);
  const isStandalone = useState<boolean>("pwaInstall:isStandalone", () => false);
  const isIos = useState<boolean>("pwaInstall:isIos", () => false);
  const hasDeferredPrompt = useState<boolean>("pwaInstall:hasDeferredPrompt", () => false);
  const showIosSheet = useState<boolean>("pwaInstall:showIosSheet", () => false);

  const state = computed<PwaInstallState>(() => {
    if (!isReady.value) return "hidden";
    return resolvePwaInstallState({
      isStandalone: isStandalone.value,
      isIos: isIos.value,
      hasDeferredPrompt: hasDeferredPrompt.value,
    });
  });

  function registerListeners(): void {
    if (listenerRegistered || typeof window === "undefined") return;
    listenerRegistered = true;

    // preventDefault() : on garde la main pour déclencher l'invite au clic
    // sur NOTRE bouton plutôt que la mini-infobar par défaut de Chrome —
    // seul moyen de proposer un bouton "Installer l'application" cohérent
    // avec le reste de l'UI landing plutôt que de dépendre d'un élément
    // navigateur non stylable.
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredPrompt = event as BeforeInstallPromptEvent;
      hasDeferredPrompt.value = true;
    });

    // L'installation peut aussi survenir sans passer par notre bouton (icône
    // native de la barre d'adresse Chrome/Edge) : le bouton doit disparaître
    // dans ce cas aussi, pas seulement après un clic dessus.
    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      hasDeferredPrompt.value = false;
      isStandalone.value = true;
    });
  }

  // Lecture seule de l'état de la plateforme — jamais de prompt déclenché
  // ici (même règle que useWebPush.ts::initialize()). À appeler depuis
  // onMounted() du composant qui affiche le bouton.
  function initialize(): void {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    isReady.value = true;

    const matchesStandaloneMedia = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
    const iosNavigatorStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
    isStandalone.value = isStandaloneDisplay(matchesStandaloneMedia, iosNavigatorStandalone);
    isIos.value = isIosDevice(navigator.userAgent, navigator.maxTouchPoints || 0);
    hasDeferredPrompt.value = deferredPrompt !== null;

    registerListeners();
  }

  // Seule fonction qui déclenche réellement une action d'installation —
  // jamais automatique, uniquement depuis le clic explicite du bouton. Sur
  // iOS, ouvre la modale d'instructions (aucune invite native possible) ;
  // sinon déclenche l'invite native capturée par beforeinstallprompt.
  async function promptInstall(): Promise<void> {
    if (state.value === "ios_instructions") {
      showIosSheet.value = true;
      return;
    }
    if (!deferredPrompt) return;
    const prompt = deferredPrompt;
    // Une invite native ne peut être déclenchée qu'une fois : on la
    // "consomme" immédiatement pour ne pas retenter prompt() sur un
    // événement déjà utilisé si le bouton reste affiché un instant.
    deferredPrompt = null;
    hasDeferredPrompt.value = false;
    await prompt.prompt();
    await prompt.userChoice;
  }

  function closeIosSheet(): void {
    showIosSheet.value = false;
  }

  return {
    state,
    showIosSheet,
    initialize,
    promptInstall,
    closeIosSheet,
  };
}
