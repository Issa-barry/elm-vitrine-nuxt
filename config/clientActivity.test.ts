import { describe, expect, it } from "vitest";
import {
  ACTIVITY_PERIODS,
  activityPayment,
  activityPeriodLabel,
  activityTypeLabel,
  avancementSeverity,
  lienLabel,
  liensDuCompte,
  operationBadges,
} from "./clientActivity";

describe("activityTypeLabel", () => {
  it("traduit le type réel, jamais l'avancement", () => {
    expect(activityTypeLabel("vente")).toBe("Vente");
    expect(activityTypeLabel("logistique")).toBe("Transfert logistique");
  });
});

describe("lien et badges (ADR 0058)", () => {
  it("nomme chaque lien du point de vue du compte", () => {
    expect(lienLabel("client")).toBe("Ma commande");
    expect(lienLabel("livreur")).toBe("Livraison");
    expect(lienLabel("proprietaire")).toBe("Vente sur véhicule");
  });

  it("une vente porte un badge par lien, un transfert reste un transfert", () => {
    expect(operationBadges({ type: "vente", liens: ["client", "livreur", "proprietaire"] })).toEqual(["Ma commande", "Livraison", "Vente sur véhicule"]);
    expect(operationBadges({ type: "logistique", liens: ["livreur", "proprietaire"] })).toEqual(["Transfert logistique"]);
  });

  it("déduit les liens possibles des activités du compte", () => {
    const base = { organization_id: "org", client_id: null, proprietaire_id: null, livreur_id: null };
    expect(liensDuCompte(null)).toEqual([]);
    expect(liensDuCompte({ ...base, parrain_id: "par" })).toEqual([]);
    expect(liensDuCompte({ ...base, client_id: "c" })).toEqual(["client"]);
    expect(liensDuCompte({ ...base, client_id: "c", livreur_id: "l", proprietaire_id: "p" })).toEqual(["client", "livreur", "proprietaire"]);
  });
});

describe("avancementSeverity", () => {
  it("vert pour une opération aboutie, gris pour une annulation, ambre pour un retour, bleu sinon", () => {
    expect(avancementSeverity("terminee")).toBe("success");
    expect(avancementSeverity("livree")).toBe("success");
    expect(avancementSeverity("retiree")).toBe("success");
    expect(avancementSeverity("annulee")).toBe("secondary");
    expect(avancementSeverity("retournee")).toBe("warn");
    expect(avancementSeverity("en_cours_de_cloture")).toBe("info");
    expect(avancementSeverity("receptionne")).toBe("info");
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
  it("affiche un paiement partiel, impayé ou un acompte en attention", () => {
    expect(activityPayment({ statut_paiement: "partiel", statut_paiement_label: "Partiellement payée" })).toEqual({ label: "Partiellement payée", severity: "warn" });
    expect(activityPayment({ statut_paiement: "impayee", statut_paiement_label: "Impayée" })).toEqual({ label: "Impayée", severity: "warn" });
    expect(activityPayment({ statut_paiement: "acompte_recu", statut_paiement_label: "Acompte reçu" })).toEqual({ label: "Acompte reçu", severity: "warn" });
  });

  it("affiche une facture payée en succès", () => {
    expect(activityPayment({ statut_paiement: "payee", statut_paiement_label: "Payée" })).toEqual({ label: "Payée", severity: "success" });
  });

  it("n'affiche rien sans paiement visible, pour une facture créée ou annulée", () => {
    expect(activityPayment({ statut_paiement: null, statut_paiement_label: null })).toBeNull();
    expect(activityPayment({ statut_paiement: "creee", statut_paiement_label: "Créée" })).toBeNull();
    expect(activityPayment({ statut_paiement: "annulee", statut_paiement_label: "Annulée" })).toBeNull();
  });
});
