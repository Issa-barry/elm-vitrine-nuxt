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
  it("contexte inconnu -> aucune capacité (jamais un menu affiché par défaut)", () => {
    expect(resolveClientCapabilities(null)).toEqual({
      dashboard: false, commissions: false, expenses: false, vehicles: false,
      orders: false, services: false, parrain: false, profile: false,
    });
  });

  it("compte sans activité : seulement Commandes, ouverte à tout compte (ADR 0058)", () => {
    expect(resolveClientCapabilities(ctx({}))).toEqual({
      dashboard: false, commissions: false, expenses: false, vehicles: false,
      orders: true, services: false, parrain: false, profile: false,
    });
  });

  it("proprietaire seul : véhicules et commandes visibles", () => {
    const caps = resolveClientCapabilities(ctx({ proprietaire_id: "prop-1" }));
    expect(caps).toEqual({
      dashboard: true, commissions: true, expenses: true, vehicles: true,
      orders: true, services: false, parrain: false, profile: true,
    });
  });

  it("livreur seul : véhicules (équipe) et commandes visibles", () => {
    const caps = resolveClientCapabilities(ctx({ livreur_id: "liv-1" }));
    expect(caps.vehicles).toBe(true);
    expect(caps.orders).toBe(true);
  });

  it("client seul : commandes visibles, pas véhicules", () => {
    const caps = resolveClientCapabilities(ctx({ client_id: "cli-1" }));
    expect(caps).toEqual({
      dashboard: true, commissions: true, expenses: true, vehicles: false,
      orders: true, services: false, parrain: false, profile: true,
    });
  });

  // Matrice du chantier "capacités prestataire" du 27/08/2026 (préparation
  // UI uniquement, prestataire_id n'existe pas encore côté backend réel).
  it("prestataire seul : commissions/dépenses/profil et commandes, jamais véhicules", () => {
    const caps = resolveClientCapabilities(ctx({ prestataire_id: "prest-1" }));
    expect(caps).toEqual({
      dashboard: true, commissions: true, expenses: true, vehicles: false,
      orders: true, services: true, parrain: false, profile: true,
    });
  });

  it("proprietaire + prestataire : ajoute véhicules", () => {
    const caps = resolveClientCapabilities(ctx({ proprietaire_id: "prop-1", prestataire_id: "prest-1" }));
    expect(caps.vehicles).toBe(true);
    expect(caps.services).toBe(true);
    expect(caps.orders).toBe(true);
  });

  it("parrain seul : son espace, son profil et ses commandes, jamais les menus lus sur le dashboard propriétaire/livreur", () => {
    expect(resolveClientCapabilities(ctx({ parrain_id: "par-1" }))).toEqual({
      dashboard: false, commissions: false, expenses: false, vehicles: false,
      orders: true, services: false, parrain: true, profile: true,
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
      orders: true, services: false, parrain: false, profile: true,
    });
    expect(resolveClientCapabilities(ctx({ consultant_ids: [] })).dashboard).toBe(false);
  });

  it("propriétaire + livreur + parrain + consultant : un seul tableau de bord, l'espace parrain en plus", () => {
    const caps = resolveClientCapabilities(ctx({ proprietaire_id: "prop-1", livreur_id: "liv-1", parrain_id: "par-1", consultant_ids: ["prest-1"] }));
    expect(caps).toMatchObject({ dashboard: true, commissions: true, vehicles: true, parrain: true, services: false, orders: true });
  });

  it("client + proprietaire + prestataire : tout est visible", () => {
    const caps = resolveClientCapabilities(ctx({ client_id: "cli-1", proprietaire_id: "prop-1", prestataire_id: "prest-1" }));
    expect(caps).toEqual({
      dashboard: true, commissions: true, expenses: true, vehicles: true,
      orders: true, services: true, parrain: false, profile: true,
    });
  });
});
