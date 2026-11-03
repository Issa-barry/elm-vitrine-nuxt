import { describe, expect, it } from "vitest";
import { ACTIVITY_PERIODS, activityPeriodLabel, activityTypeLabel } from "./clientActivity";

describe("activityTypeLabel", () => {
  it("traduit le type réel, jamais le statut", () => {
    expect(activityTypeLabel("vente")).toBe("Vente");
    expect(activityTypeLabel("logistique")).toBe("Logistique");
  });
});

describe("ACTIVITY_PERIODS", () => {
  it("propose les sept périodes demandées, avec les clés du backend (ActiviteMineRequest::PERIODES)", () => {
    expect(ACTIVITY_PERIODS.map((period) => [period.value, period.label])).toEqual([
      ["aujourd_hui", "Aujourd’hui"],
      ["hier", "Hier"],
      ["cette_semaine", "Cette semaine"],
      ["semaine_precedente", "Semaine dernière"],
      ["ce_mois", "Ce mois"],
      ["mois_precedent", "Mois dernier"],
      ["cette_annee", "Cette année"],
    ]);
  });

  it("traduit une clé en libellé", () => {
    expect(activityPeriodLabel("semaine_precedente")).toBe("Semaine dernière");
  });
});
