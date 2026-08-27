import { checkAuthSessionPassword, findMissingRequiredConfig } from "../../config/runtime";

// Nitro exécute ce plugin une seule fois, au démarrage du serveur — avant
// d'accepter la moindre requête. But : échouer bruyamment plutôt que de
// laisser tourner un environnement (préprod/recette/production) avec une
// URL d'API, un site ou un secret de session vide, ce qui produirait des
// erreurs confuses plus tard. En local, on se contente d'avertir pour ne pas
// bloquer le dev.
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig();
  const missing = findMissingRequiredConfig(config);

  const problems: string[] = missing.map((key) => {
    const envVar = `NUXT_PUBLIC_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`;
    return `${envVar} manquante.`;
  });

  // authSessionPassword (server/utils/authSession.ts) est serveur-only, donc
  // hors de findMissingRequiredConfig ci-dessus (qui ne porte que sur
  // `public`) — vérifié séparément ici, avec le même traitement warn/throw.
  const authSessionPasswordIssue = checkAuthSessionPassword(String(config.authSessionPassword || ""));
  if (authSessionPasswordIssue) {
    problems.push(authSessionPasswordIssue);
  }

  if (!problems.length) return;

  if (config.public.environment === "local") {
    console.warn(`[config] Configuration incomplète en local : ${problems.join(" ")}`);
    return;
  }

  throw new Error(
    `Configuration incomplète pour l'environnement "${config.public.environment}" : ` +
      `${problems.join(" ")} Renseignez ces valeurs dans le panneau Hostinger de cet ` +
      "environnement avant de démarrer le serveur.",
  );
});
