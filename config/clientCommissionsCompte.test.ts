import { describe, expect, it } from "vitest";
import { commissionStatutSeverity, dateCommission, periodeDuDetail, vehiculeCommission } from "./clientCommissionsCompte";

describe("affichage d'une ligne de commission", () => {
  it("formate la date de gain sans fuseau", () => {
    expect(dateCommission("2026-10-20")).toBe("20/10/2026");
    expect(dateCommission("2026-10-31T23:30:00Z")).toBe("31/10/2026");
    expect(dateCommission(null)).toBe("—");
  });

  it("nomme le véhicule ou signale une opération sans véhicule", () => {
    expect(vehiculeCommission({ vehicule: { id: "v", nom_vehicule: "C-parraine", immatriculation: "CC-003" } })).toBe("C-parraine · CC-003");
    expect(vehiculeCommission({ vehicule: null })).toBe("Sans véhicule");
  });
});

describe("période du détail des commissions", () => {
  it("reprend une période comptable telle quelle", () => {
    expect(periodeDuDetail({ annee: 2026, mois: 10, quinzaine: "P2", date_debut: "2026-10-16", date_fin: "2026-10-31" }))
      .toEqual({ annee: 2026, mois: 10, quinzaine: "P2" });
    expect(periodeDuDetail({ annee: 2026, mois: 10, quinzaine: "TOUT", date_debut: "2026-10-01", date_fin: "2026-10-31" }))
      .toEqual({ annee: 2026, mois: 10, quinzaine: "TOUT" });
  });

  it("garde l'année entière sans mois ni quinzaine", () => {
    expect(periodeDuDetail({ annee: 2025, mois: null, quinzaine: null, date_debut: "2025-01-01", date_fin: "2025-12-31" })).toEqual({ annee: 2025 });
  });

  it("reprend les bornes du serveur pour les autres périodes", () => {
    expect(periodeDuDetail({ date_debut: "2026-10-27", date_fin: "2026-11-02" })).toEqual({ date_debut: "2026-10-27", date_fin: "2026-11-02" });
  });

  it("couvre toutes les périodes sans borne", () => {
    expect(periodeDuDetail({ date_debut: null, date_fin: null })).toEqual({ periode: "tout" });
  });
});

describe("couleur du statut d'une commission", () => {
  it("n'affiche jamais une commission à payer en rouge", () => {
    expect(commissionStatutSeverity("paye")).toBe("success");
    expect(commissionStatutSeverity("impaye")).toBe("warn");
    expect(commissionStatutSeverity("partiel")).toBe("warn");
    expect(commissionStatutSeverity("creee")).toBe("secondary");
    expect(commissionStatutSeverity("annulee")).toBe("secondary");
    expect(commissionStatutSeverity(null)).toBe("warn");
  });
});
