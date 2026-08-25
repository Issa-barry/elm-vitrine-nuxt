export interface PublicRuntimeConfig {
  siteUrl: string;
  apiBase: string;
  environment: string;
  appName: string;
  appVersion: string;
  // Nuxt augmente runtimeConfig.public via son propre système de types
  // (modules, hooks...) : la signature d'index le rend assignable au type
  // `RuntimeConfig` généré par Nuxt.
  [key: string]: unknown;
}

export interface AppRuntimeConfig {
  monolithApiBase: string;
  vitrineServiceToken: string;
  public: PublicRuntimeConfig;
  [key: string]: unknown;
}

export const runtimeConfigDefaults: AppRuntimeConfig = {
  monolithApiBase: "",
  vitrineServiceToken: "",
  public: {
    siteUrl: "",
    apiBase: "",
    environment: "local",
    appName: "Eau La Maman",
    appVersion: process.env.npm_package_version || "0.0.0",
  },
};

// Variables publiques sans lesquelles le site ne peut pas fonctionner
// correctement hors du poste local (il ne saurait pas où appeler l'API ni
// quelle URL canonique annoncer). `vitrineServiceToken` n'est pas encore
// exigé par le backend (voir docs/environment.md) et n'est donc pas validé.
const REQUIRED_PUBLIC_KEYS = ["siteUrl", "apiBase"] as const satisfies ReadonlyArray<
  keyof PublicRuntimeConfig
>;

export function findMissingRequiredConfig(config: Pick<AppRuntimeConfig, "public">): string[] {
  return REQUIRED_PUBLIC_KEYS.filter((key) => !config.public[key]);
}

export function isProductionEnvironment(environment: string): boolean {
  return environment === "production";
}

// Hors production (local, préprod, recette) : on ne veut jamais qu'un moteur
// de recherche indexe autre chose que le vrai site en prod.
export function getRobotsMetaContent(environment: string): string {
  return isProductionEnvironment(environment) ? "index, follow" : "noindex, nofollow";
}

export function buildRobotsTxt(environment: string): string {
  return isProductionEnvironment(environment)
    ? "User-agent: *\nAllow: /\n"
    : "User-agent: *\nDisallow: /\n";
}
