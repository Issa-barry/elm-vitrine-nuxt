import { isProductionEnvironment } from "../../config/runtime";

// Manifest PWA généré à la requête (comme robots.txt.ts) plutôt qu'écrit en
// statique au build : ce même artefact .output peut tourner sur plusieurs
// environnements Hostinger (préprod/production/recette) avec des valeurs
// NUXT_PUBLIC_* différentes, et le nom affiché doit refléter l'environnement
// réel (voir docs/environment.md et docs/pwa.md) — jamais "Eau La Maman" figé
// au build pour un testeur préprod.
export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const { appName, environment } = config.public;
  const shortName = isProductionEnvironment(environment) ? "ELM" : appName;

  setHeader(event, "Content-Type", "application/manifest+json; charset=utf-8");

  return {
    id: "/",
    name: appName,
    short_name: shortName,
    description:
      "Espace client Eau La Maman : suivez vos commandes, véhicules, dépenses et gains.",
    lang: "fr",
    dir: "ltr",
    start_url: "/espace-client",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      { src: "/icons/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
});
