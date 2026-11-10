import { describe, expect, it } from "vitest";
import type { AuthContext } from "./auth";
import { compteSansActivite } from "./clientAccueil";
import { resolveClientCapabilities } from "./clientCapabilities";

const ctx = (overrides: Partial<AuthContext> = {}): AuthContext => ({
  organization_id: "org",
  client_id: null,
  proprietaire_id: null,
  livreur_id: null,
  parrain_id: null,
  consultant_ids: [],
  ...overrides,
});

describe("compteSansActivite", () => {
  it("reconnaît un compte actif sans aucune activité (agent du back-office seul)", () => {
    expect(compteSansActivite(ctx())).toBe(true);
    expect(compteSansActivite(ctx({ organization_id: null }))).toBe(true);
  });

  it("ne range jamais un compte avec une activité parmi les comptes sans activité", () => {
    expect(compteSansActivite(ctx({ client_id: "c1" }))).toBe(false);
    expect(compteSansActivite(ctx({ proprietaire_id: "p1" }))).toBe(false);
    expect(compteSansActivite(ctx({ livreur_id: "l1" }))).toBe(false);
    expect(compteSansActivite(ctx({ parrain_id: "pa1" }))).toBe(false);
    expect(compteSansActivite(ctx({ consultant_ids: ["co1"] }))).toBe(false);
  });

  it("la liste Commandes, ouverte à tout compte, ne compte pas comme une activité", () => {
    expect(resolveClientCapabilities(ctx()).orders).toBe(true);
    expect(compteSansActivite(ctx())).toBe(true);
  });

  it("ne conclut rien tant que le contexte est inconnu", () => {
    expect(compteSansActivite(null)).toBe(false);
    expect(compteSansActivite(undefined)).toBe(false);
  });
});
