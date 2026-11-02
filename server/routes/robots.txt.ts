import { buildRobotsTxt } from "../../config/runtime";

// Empêche l'indexation de tout environnement autre que la production
// (préprod, recette, local) — piloté uniquement par NUXT_PUBLIC_ENVIRONMENT,
// jamais par une liste d'URLs codée en dur.
export default defineEventHandler((event) => {
  // Pas d'event passé à useRuntimeConfig : optionnel dans la signature
  // Nitro (nitropack/dist/runtime/config.d.ts), utile pour un contexte
  // edge/par-requête. Sur un preset Node classique (notre déploiement
  // Hostinger), la config est la même avec ou sans event, et l'omettre
  // évite une collision de type avec le useRuntimeConfig() app-side (voir
  // docs/environment.md).
  const config = useRuntimeConfig();
  setHeader(event, "Content-Type", "text/plain; charset=utf-8");
  return buildRobotsTxt(config.public.environment);
});
