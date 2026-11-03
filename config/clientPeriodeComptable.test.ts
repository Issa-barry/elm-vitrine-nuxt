import { describe, expect, it } from "vitest";
import {
  MOIS,
  PERIODES_RAPIDES,
  QUINZAINES,
  TOUTE_ANNEE,
  anneesProposees,
  bornesDepuisLien,
  bornesLabel,
  estMoisCourant,
  periodeComptableCourante,
  periodeComptableLabel,
  periodeComptableQuery,
  periodePrecedente,
  periodeRapideLabel,
} from "./clientPeriodeComptable";

const NOVEMBRE = new Date("2026-11-03T10:00:00Z");

describe("periodeComptableCourante", () => {
  it("part du mois et de l'année en cours, mois entier", () => {
    expect(periodeComptableCourante(NOVEMBRE)).toEqual({ annee: 2026, mois: 11, quinzaine: "TOUT" });
  });

  it("lit la date en UTC", () => {
    expect(periodeComptableCourante(new Date("2026-12-31T23:59:59Z"))).toEqual({ annee: 2026, mois: 12, quinzaine: "TOUT" });
    expect(periodeComptableCourante(new Date("2027-01-01T00:00:00Z"))).toEqual({ annee: 2027, mois: 1, quinzaine: "TOUT" });
  });
});

describe("anneesProposees", () => {
  it("propose l'année en cours et les précédentes, jamais une année future", () => {
    expect(anneesProposees(2026)).toEqual([2026, 2025, 2024, 2023, 2022]);
  });
});

describe("options", () => {
  it("expose les valeurs attendues par le backend (PeriodeComptableFiltre::QUINZAINES)", () => {
    expect(QUINZAINES.map((quinzaine) => quinzaine.value)).toEqual(["TOUT", "P1", "P2"]);
  });

  it("liste l'année entière puis les douze mois, numérotés de 1 à 12", () => {
    expect(MOIS).toHaveLength(13);
    expect(MOIS[0]).toEqual({ value: TOUTE_ANNEE, label: "Toute l’année" });
    expect(MOIS[1]).toEqual({ value: 1, label: "Janvier" });
    expect(MOIS[12]).toEqual({ value: 12, label: "Décembre" });
  });

  it("propose les périodes rapides demandées, avec les clés du backend (DashboardMineRequest::PERIODES)", () => {
    expect(PERIODES_RAPIDES.map((periode) => [periode.value, periode.label])).toEqual([
      ["aujourd_hui", "Aujourd’hui"],
      ["hier", "Hier"],
      ["cette_semaine", "Cette semaine"],
      ["semaine_precedente", "Semaine dernière"],
      ["ce_mois", "Ce mois"],
      ["mois_precedent", "Mois dernier"],
      ["cette_annee", "Cette année"],
      ["annee_precedente", "Année dernière"],
      ["tout", "Toutes les périodes"],
    ]);
    expect(periodeRapideLabel("annee_precedente")).toBe("Année dernière");
  });
});

describe("periodeComptableQuery", () => {
  it("transmet année, mois et quinzaine", () => {
    expect(periodeComptableQuery({ annee: 2026, mois: 11, quinzaine: "P1" })).toEqual({ annee: 2026, mois: 11, quinzaine: "P1" });
  });

  it("ne transmet que l'année pour l'année entière", () => {
    expect(periodeComptableQuery({ annee: 2025, mois: TOUTE_ANNEE, quinzaine: "TOUT" })).toEqual({ annee: 2025 });
  });
});

describe("periodePrecedente", () => {
  it("recule d'un mois dans la même année", () => {
    expect(periodePrecedente({ annee: 2026, mois: 11, quinzaine: "TOUT" })).toEqual({ annee: 2026, mois: 10, quinzaine: "TOUT" });
  });

  it("change d'année en janvier", () => {
    expect(periodePrecedente({ annee: 2026, mois: 1, quinzaine: "TOUT" })).toEqual({ annee: 2025, mois: 12, quinzaine: "TOUT" });
  });

  it("compare une année entière à la précédente", () => {
    expect(periodePrecedente({ annee: 2026, mois: TOUTE_ANNEE, quinzaine: "TOUT" })).toEqual({ annee: 2025, mois: TOUTE_ANNEE, quinzaine: "TOUT" });
  });

  it("ne compare pas une quinzaine", () => {
    expect(periodePrecedente({ annee: 2026, mois: 11, quinzaine: "P1" })).toBeNull();
    expect(periodePrecedente({ annee: 2026, mois: 11, quinzaine: "P2" })).toBeNull();
  });
});

describe("periodeComptableLabel", () => {
  it("nomme le mois en cours « Ce mois »", () => {
    expect(estMoisCourant({ annee: 2026, mois: 11, quinzaine: "TOUT" }, NOVEMBRE)).toBe(true);
    expect(periodeComptableLabel({ annee: 2026, mois: 11, quinzaine: "TOUT" }, NOVEMBRE)).toBe("Ce mois");
  });

  it("précise la quinzaine, le mois ou l'année dans les autres cas", () => {
    expect(periodeComptableLabel({ annee: 2026, mois: 11, quinzaine: "P1" }, NOVEMBRE)).toBe("Novembre 2026 · P1");
    expect(periodeComptableLabel({ annee: 2026, mois: 10, quinzaine: "TOUT" }, NOVEMBRE)).toBe("Octobre 2026");
    expect(periodeComptableLabel({ annee: 2025, mois: TOUTE_ANNEE, quinzaine: "TOUT" }, NOVEMBRE)).toBe("Année 2025");
  });
});

describe("bornesLabel", () => {
  it("affiche les bornes du backend sans décalage de fuseau", () => {
    expect(bornesLabel("2024-02-16", "2024-02-29")).toBe("Du 16/02/2024 au 29/02/2024");
  });

  it("reste vide tant que les bornes sont inconnues", () => {
    expect(bornesLabel(null, null)).toBe("");
    expect(bornesLabel(undefined, "2026-11-30")).toBe("");
  });
});

describe("bornesDepuisLien", () => {
  it("lit les deux bornes du lien", () => {
    expect(bornesDepuisLien({ du: "2026-11-02", au: "2026-11-08" })).toEqual({ du: "2026-11-02", au: "2026-11-08" });
  });

  it("ignore un lien incomplet ou mal formé", () => {
    expect(bornesDepuisLien({})).toBeNull();
    expect(bornesDepuisLien({ du: "2026-11-02" })).toBeNull();
    expect(bornesDepuisLien({ du: "hier", au: "2026-11-08" })).toBeNull();
    expect(bornesDepuisLien({ du: ["2026-11-02"], au: "2026-11-08" })).toBeNull();
  });
});
