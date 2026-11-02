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
  // Secret de scellement du cookie de session BFF (server/utils/authSession.ts)
  // — jamais sous `public` (voir le test dédié dans config/runtime.test.ts).
  // >= 32 caractères imposés par h3 useSession (iron-webcrypto).
  authSessionPassword: string;
  public: PublicRuntimeConfig;
  [key: string]: unknown;
}

export const runtimeConfigDefaults: AppRuntimeConfig = {
  monolithApiBase: "",
  vitrineServiceToken: "",
  authSessionPassword: "",
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

// authSessionPassword (server/utils/authSession.ts) est serveur-only —
// jamais sous `public`, donc hors de REQUIRED_PUBLIC_KEYS/
// findMissingRequiredConfig ci-dessus, qui ne portent que sur `public`.
// >= 32 caractères imposés par h3 useSession (iron-webcrypto) pour le
// scellement du cookie de session BFF.
const MIN_AUTH_SESSION_PASSWORD_LENGTH = 32;

export function checkAuthSessionPassword(password: string): string | null {
  if (!password) {
    return "NUXT_AUTH_SESSION_PASSWORD manquante.";
  }
  if (password.length < MIN_AUTH_SESSION_PASSWORD_LENGTH) {
    return `NUXT_AUTH_SESSION_PASSWORD trop courte (${password.length} caractères, ${MIN_AUTH_SESSION_PASSWORD_LENGTH} minimum).`;
  }
  return null;
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
