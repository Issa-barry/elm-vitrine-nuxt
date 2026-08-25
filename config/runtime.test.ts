import { describe, expect, it } from "vitest";
import {
  buildRobotsTxt,
  findMissingRequiredConfig,
  getRobotsMetaContent,
  runtimeConfigDefaults,
} from "./runtime";

describe("runtimeConfigDefaults", () => {
  it("ne place aucun secret sous public (ce qui finit dans le bundle navigateur)", () => {
    const publicKeys = Object.keys(runtimeConfigDefaults.public);
    expect(publicKeys).not.toContain("monolithApiBase");
    expect(publicKeys).not.toContain("vitrineServiceToken");
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
