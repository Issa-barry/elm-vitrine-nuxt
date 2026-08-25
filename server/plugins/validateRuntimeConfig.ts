import { findMissingRequiredConfig } from "../../config/runtime";

// Nitro exécute ce plugin une seule fois, au démarrage du serveur — avant
// d'accepter la moindre requête. But : échouer bruyamment plutôt que de
// laisser tourner un environnement (préprod/recette/production) avec une
// URL d'API ou un site vide, ce qui produirait des erreurs confuses plus
// tard. En local, on se contente d'avertir pour ne pas bloquer le dev.
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig();
  const missing = findMissingRequiredConfig(config);

  if (!missing.length) return;

  const missingEnvVars = missing.map(
    (key) => `NUXT_PUBLIC_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`,
  );

  if (config.public.environment === "local") {
    console.warn(`[config] Variable(s) publique(s) non renseignée(s) en local : ${missingEnvVars.join(", ")}.`);
    return;
  }

  throw new Error(
    `Configuration incomplète pour l'environnement "${config.public.environment}" : ` +
      `${missingEnvVars.join(", ")} manquante(s). Renseignez-les dans le panneau Hostinger ` +
      "de cet environnement avant de démarrer le serveur.",
  );
});
