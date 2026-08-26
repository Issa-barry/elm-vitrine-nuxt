import { describe, expect, it } from "vitest";
import {
  buildRobotsTxt,
  checkAuthSessionPassword,
  findMissingRequiredConfig,
  getRobotsMetaContent,
  runtimeConfigDefaults,
} from "./runtime";

describe("runtimeConfigDefaults", () => {
  it("ne place aucun secret sous public (ce qui finit dans le bundle navigateur)", () => {
    const publicKeys = Object.keys(runtimeConfigDefaults.public);
    expect(publicKeys).not.toContain("monolithApiBase");
    expect(publicKeys).not.toContain("vitrineServiceToken");
    expect(publicKeys).not.toContain("authSessionPassword");
  });
});

describe("findMissingRequiredConfig", () => {
  it("signale siteUrl et apiBase quand ils sont vides", () => {
    const missing = findMissingRequiredConfig({
      public: { ...runtimeConfigDefaults.public, siteUrl: "", apiBase: "" },
    });
    expect(missing).toEqual(["siteUrl", "apiBase"]);
  });

  it("ne signale rien quand siteUrl et apiBase sont renseignés (cas production)", () => {
    const missing = findMissingRequiredConfig({
      public: {
        ...runtimeConfigDefaults.public,
        siteUrl: "https://eau-la-maman.com",
        apiBase: "https://fello.eau-la-maman.com",
        environment: "production",
      },
    });
    expect(missing).toEqual([]);
  });

  it("n'exige pas vitrineServiceToken : le backend ne le réclame pas encore", () => {
    const missing = findMissingRequiredConfig({
      public: {
        ...runtimeConfigDefaults.public,
        siteUrl: "https://eau-la-maman.com",
        apiBase: "https://fello.eau-la-maman.com",
      },
    });
    expect(missing).toEqual([]);
  });
});

describe("SEO selon l'environnement", () => {
  it("autorise l'indexation uniquement en production", () => {
    expect(getRobotsMetaContent("production")).toBe("index, follow");
    expect(getRobotsMetaContent("preprod")).toBe("noindex, nofollow");
    expect(getRobotsMetaContent("recette")).toBe("noindex, nofollow");
    expect(getRobotsMetaContent("local")).toBe("noindex, nofollow");
  });

  it("robots.txt n'autorise le crawl que sur l'environnement de production", () => {
    expect(buildRobotsTxt("production")).toBe("User-agent: *\nAllow: /\n");
    expect(buildRobotsTxt("preprod")).toBe("User-agent: *\nDisallow: /\n");
  });
});

describe("checkAuthSessionPassword", () => {
  it("signale une valeur manquante", () => {
    expect(checkAuthSessionPassword("")).toMatch(/manquante/);
  });

  it("signale une valeur trop courte (< 32 caractères, contrainte h3 useSession)", () => {
    expect(checkAuthSessionPassword("trop-court")).toMatch(/trop courte/);
  });

  it("accepte une valeur d'au moins 32 caractères", () => {
    expect(checkAuthSessionPassword("a".repeat(32))).toBeNull();
    expect(checkAuthSessionPassword("a".repeat(64))).toBeNull();
  });
});
