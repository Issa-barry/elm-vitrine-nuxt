// Installation PWA (bouton "Installer l'application", landing) — même
// approche que config/webPush.ts : logique pure ici (testable sans DOM),
// accès navigateur réels dans composables/usePwaInstall.ts.
//
// iOS (Safari/WebKit) ne déclenche jamais `beforeinstallprompt` : aucune
// tentative de reproduire artificiellement le comportement Android (voir
// docs/pwa.md § iPhone/iPad Safari) — un parcours manuel dédié (modale
// d'instructions "Partager -> Ajouter à l'écran d'accueil") est proposé à la
// place, jamais un vrai déclenchement automatique.
export type PwaInstallState =
  | "hidden" // déjà installée (standalone), ou aucun chemin d'installation détecté
  | "ios_instructions" // iOS non standalone : bouton -> modale d'instructions Safari
  | "native_prompt"; // beforeinstallprompt capté (Android/Chrome, desktop) : bouton -> invite native

export interface PwaInstallStateInput {
  isStandalone: boolean;
  isIos: boolean;
  hasDeferredPrompt: boolean;
}

// Priorité à l'invite native dès qu'elle est disponible (couvre aussi le cas
// futur où un navigateur exposerait beforeinstallprompt sur iOS) ; iOS
// retombe sur les instructions manuelles ; tout le reste (navigateur qui ne
// propose ni l'un ni l'autre, ex. Firefox desktop) reste masqué plutôt que
// d'afficher un bouton qui échouerait silencieusement.
export function resolvePwaInstallState(input: PwaInstallStateInput): PwaInstallState {
  if (input.isStandalone) return "hidden";
  if (input.hasDeferredPrompt) return "native_prompt";
  if (input.isIos) return "ios_instructions";
  return "hidden";
}
