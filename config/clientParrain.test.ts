import { describe, expect, it } from "vitest";
import {
  formatParrainDate,
  isParrainSpacePath,
  parrainCommissionStatusLabel,
  parrainCommissionStatusSeverity,
} from "./clientParrain";

describe("isParrainSpacePath", () => {
  it("reconnaît l'accueil et les sous-pages de l'espace parrain", () => {
    expect(isParrainSpacePath("/espace-client/parrain")).toBe(true);
    expect(isParrainSpacePath("/espace-client/parrain/commissions")).toBe(true);
  });

  it("ne confond pas un autre chemin qui commence pareil", () => {
    expect(isParrainSpacePath("/espace-client/parrainage")).toBe(false);
    expect(isParrainSpacePath("/espace-client/commissions")).toBe(false);
  });
});

describe("statut d'une commission", () => {
  it("n'affiche jamais le libellé interne Créée", () => {
    expect(parrainCommissionStatusLabel("creee")).toBe("En attente de validation");
  });

  it("garde une valeur inconnue plutôt que de l'inventer", () => {
    expect(parrainCommissionStatusLabel("nouveau")).toBe("nouveau");
  });

  it("n'affiche jamais une commission normale en rouge", () => {
    expect(["creee", "impaye", "partiel", "paye"].map(parrainCommissionStatusSeverity))
      .toEqual(["secondary", "warn", "warn", "success"]);
  });
});

describe("formatParrainDate", () => {
  it("affiche un tiret sans date", () => {
    expect(formatParrainDate(null)).toBe("—");
  });

  it("formate une date en français", () => {
    expect(formatParrainDate("2026-10-16")).toContain("2026");
  });
});
