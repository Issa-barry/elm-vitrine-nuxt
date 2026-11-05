import { describe, expect, it } from "vitest";
import { ACTIVITY_PERIODS, activityPayment, activityPeriodLabel, activityTypeLabel } from "./clientActivity";

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

describe("activityPayment", () => {
  it("affiche un paiement partiel ou impayé en attention", () => {
    expect(activityPayment({ statut_paiement: "partiel", statut_paiement_label: "Partiellement payée" })).toEqual({ label: "Partiellement payée", severity: "warn" });
    expect(activityPayment({ statut_paiement: "impayee", statut_paiement_label: "Impayée" })).toEqual({ label: "Impayée", severity: "warn" });
  });

  it("affiche une facture payée en succès", () => {
    expect(activityPayment({ statut_paiement: "payee", statut_paiement_label: "Payée" })).toEqual({ label: "Payée", severity: "success" });
  });

  it("n'affiche rien sans facture, pour une facture créée ou annulée", () => {
    expect(activityPayment({ statut_paiement: null, statut_paiement_label: null })).toBeNull();
    expect(activityPayment({ statut_paiement: "creee", statut_paiement_label: "Créée" })).toBeNull();
    expect(activityPayment({ statut_paiement: "annulee", statut_paiement_label: "Annulée" })).toBeNull();
  });
});
