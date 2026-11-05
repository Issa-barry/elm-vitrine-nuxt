import { describe, expect, it } from "vitest";
import { resolveClientCapabilities } from "./clientCapabilities";
import type { AuthContext } from "./auth";

const ctx = (partial: Partial<AuthContext>): AuthContext => ({
  organization_id: "org-1",
  client_id: null,
  proprietaire_id: null,
  livreur_id: null,
  prestataire_id: null,
  ...partial,
});

describe("resolveClientCapabilities", () => {
  it("aucun contexte -> aucune capacité (jamais un menu affiché par défaut)", () => {
    expect(resolveClientCapabilities(null)).toEqual({
      dashboard: false, commissions: false, expenses: false, vehicles: false,
      logisticsActivity: false, orders: false, services: false, parrain: false, profile: false,
    });
    expect(resolveClientCapabilities(ctx({}))).toEqual({
      dashboard: false, commissions: false, expenses: false, vehicles: false,
      logisticsActivity: false, orders: false, services: false, parrain: false, profile: false,
    });
  });

  it("proprietaire seul (scénario réel actuel) : véhicules/activité visibles, pas commandes", () => {
    const caps = resolveClientCapabilities(ctx({ proprietaire_id: "prop-1" }));
    expect(caps).toEqual({
      dashboard: true, commissions: true, expenses: true, vehicles: true,
      logisticsActivity: true, orders: false, services: false, parrain: false, profile: true,
    });
  });

  it("livreur seul (scénario réel actuel) : véhicules/activité visibles (équipe), pas commandes", () => {
    const caps = resolveClientCapabilities(ctx({ livreur_id: "liv-1" }));
    expect(caps.vehicles).toBe(true);
    expect(caps.logisticsActivity).toBe(true);
    expect(caps.orders).toBe(false);
  });

  it("client seul (scénario réel actuel) : commandes visibles, pas véhicules/activité", () => {
    const caps = resolveClientCapabilities(ctx({ client_id: "cli-1" }));
    expect(caps).toEqual({
      dashboard: true, commissions: true, expenses: true, vehicles: false,
      logisticsActivity: false, orders: true, services: false, parrain: false, profile: true,
    });
  });

  // Matrice du chantier "capacités prestataire" du 27/08/2026 (préparation
  // UI uniquement, prestataire_id n'existe pas encore côté backend réel).
  it("prestataire seul : commissions/dépenses/profil visibles, jamais véhicules/activité/commandes", () => {
    const caps = resolveClientCapabilities(ctx({ prestataire_id: "prest-1" }));
    expect(caps).toEqual({
      dashboard: true, commissions: true, expenses: true, vehicles: false,
      logisticsActivity: false, orders: false, services: true, parrain: false, profile: true,
    });
  });

  it("client + prestataire : ajoute commandes", () => {
    const caps = resolveClientCapabilities(ctx({ client_id: "cli-1", prestataire_id: "prest-1" }));
    expect(caps.orders).toBe(true);
    expect(caps.services).toBe(true);
    expect(caps.vehicles).toBe(false);
  });

  it("proprietaire + prestataire : ajoute véhicules/activité", () => {
    const caps = resolveClientCapabilities(ctx({ proprietaire_id: "prop-1", prestataire_id: "prest-1" }));
    expect(caps.vehicles).toBe(true);
    expect(caps.logisticsActivity).toBe(true);
    expect(caps.services).toBe(true);
    expect(caps.orders).toBe(false);
  });

  it("parrain seul : son espace et son profil, jamais les menus lus sur le dashboard propriétaire/livreur", () => {
    expect(resolveClientCapabilities(ctx({ parrain_id: "par-1" }))).toEqual({
      dashboard: false, commissions: false, expenses: false, vehicles: false,
      logisticsActivity: false, orders: false, services: false, parrain: true, profile: true,
    });
  });

  it("proprietaire + parrain : le menu du propriétaire ne change pas", () => {
    const seul = resolveClientCapabilities(ctx({ proprietaire_id: "prop-1" }));
    const cumul = resolveClientCapabilities(ctx({ proprietaire_id: "prop-1", parrain_id: "par-1" }));
    expect(cumul).toEqual({ ...seul, parrain: true });
  });

  it("consultant seul : tableau de bord, commissions et dépenses, sans véhicule ni espace prestations", () => {
    expect(resolveClientCapabilities(ctx({ consultant_ids: ["prest-1"] }))).toEqual({
      dashboard: true, commissions: true, expenses: true, vehicles: false,
      logisticsActivity: false, orders: false, services: false, parrain: false, profile: true,
    });
    expect(resolveClientCapabilities(ctx({ consultant_ids: [] })).dashboard).toBe(false);
  });

  it("propriétaire + livreur + parrain + consultant : un seul tableau de bord, l'espace parrain en plus", () => {
    const caps = resolveClientCapabilities(ctx({ proprietaire_id: "prop-1", livreur_id: "liv-1", parrain_id: "par-1", consultant_ids: ["prest-1"] }));
    expect(caps).toMatchObject({ dashboard: true, commissions: true, vehicles: true, parrain: true, services: false });
  });

  it("client + proprietaire + prestataire : tout est visible", () => {
    const caps = resolveClientCapabilities(ctx({ client_id: "cli-1", proprietaire_id: "prop-1", prestataire_id: "prest-1" }));
    expect(caps).toEqual({
      dashboard: true, commissions: true, expenses: true, vehicles: true,
      logisticsActivity: true, orders: true, services: true, parrain: false, profile: true,
    });
  });
});
