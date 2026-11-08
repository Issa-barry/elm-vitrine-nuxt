import { describe, expect, it } from "vitest";
import { bottomNavItems, CLIENT_NAV_ITEMS, visibleNavItems } from "./clientNavigation";
import { resolveClientCapabilities } from "./clientCapabilities";

describe("CLIENT_NAV_ITEMS — menu bas mobile", () => {
  it("contient Accueil, Véhicules, Commandes, Commissions et Dépenses, dans cet ordre", () => {
    const labels = CLIENT_NAV_ITEMS.filter((item) => item.mobileBottomNav).map((item) => item.label);
    expect(labels).toEqual(["Accueil", "Véhicules", "Commandes", "Commissions", "Dépenses"]);
  });

  it("Commandes remplace Livraisons, sans rubrique par profil (ADR 0058)", () => {
    expect(CLIENT_NAV_ITEMS.find((item) => item.key === "orders")).toMatchObject({ label: "Commandes", to: "/espace-client/commandes" });
    expect(CLIENT_NAV_ITEMS.some((item) => item.label === "Livraisons" || item.to === "/espace-client/activite")).toBe(false);
  });
});

describe("visibleNavItems", () => {
  it("ne retourne que les items dont la capacité est vraie", () => {
    const capabilities = resolveClientCapabilities({
      organization_id: "org-1", client_id: null, proprietaire_id: "prop-1", livreur_id: null, prestataire_id: null,
    });
    const items = visibleNavItems(capabilities);
    expect(items.map((item) => item.key).sort()).toEqual(
      ["commissions", "dashboard", "expenses", "orders", "profile", "vehicles"].sort(),
    );
  });

  it("contexte inconnu -> aucun item (jamais un menu affiché par défaut)", () => {
    expect(visibleNavItems(resolveClientCapabilities(null))).toEqual([]);
  });

  it("chaque item référence une capacité qui existe réellement", () => {
    const capabilities = resolveClientCapabilities({
      organization_id: "org-1", client_id: "c", proprietaire_id: "p", livreur_id: "l", prestataire_id: "pr",
    });
    for (const item of CLIENT_NAV_ITEMS) {
      expect(capabilities).toHaveProperty(item.capability);
    }
  });
});

describe("bottomNavItems", () => {
  const base = { organization_id: "org-1", client_id: null, proprietaire_id: null, livreur_id: null };
  const labels = (context: Parameters<typeof resolveClientCapabilities>[0], path: string) =>
    bottomNavItems(resolveClientCapabilities(context), path).map((item) => item.mobileLabel ?? item.label);

  it("propriétaire : Commandes à la place de Livraisons", () => {
    expect(labels({ ...base, proprietaire_id: "p" }, "/espace-client")).toEqual(["Accueil", "Véhicules", "Commandes", "Commissions", "Dépenses"]);
  });

  it("client seul : Commandes sans Véhicules", () => {
    expect(labels({ ...base, client_id: "c" }, "/espace-client")).toEqual(["Accueil", "Commandes", "Commissions", "Dépenses"]);
  });

  it("parrain seul : sa barre partout, profil compris, Commandes via le Profil", () => {
    const attendu = ["Accueil", "Véhicules", "Commissions", "Paiements", "Profil"];
    expect(labels({ ...base, parrain_id: "par" }, "/espace-client/parrain")).toEqual(attendu);
    expect(labels({ ...base, parrain_id: "par" }, "/espace-client/commandes")).toEqual(attendu);
  });

  it("propriétaire + parrain : barre habituelle hors de l'espace parrain", () => {
    expect(labels({ ...base, proprietaire_id: "p", parrain_id: "par" }, "/espace-client/vehicules"))
      .toEqual(["Accueil", "Véhicules", "Commandes", "Commissions", "Dépenses"]);
  });

  it("propriétaire + parrain : la barre de l'espace parrain propose le retour", () => {
    expect(labels({ ...base, proprietaire_id: "p", parrain_id: "par" }, "/espace-client/parrain/commissions"))
      .toEqual(["Accueil", "Véhicules", "Commissions", "Paiements", "Mon espace"]);
  });

  it("n'affiche jamais plus de 5 entrées", () => {
    for (const path of ["/espace-client", "/espace-client/parrain"]) {
      expect(labels({ ...base, client_id: "c", proprietaire_id: "p", livreur_id: "l", parrain_id: "par" }, path).length).toBeLessThanOrEqual(5);
    }
  });

  it("compte sans activité : son accueil neutre et ses Commandes", () => {
    const items = bottomNavItems(resolveClientCapabilities({ ...base }), "/espace-client/bienvenue");
    expect(items.map((item) => [item.label, item.to])).toEqual([
      ["Accueil", "/espace-client/bienvenue"],
      ["Commandes", "/espace-client/commandes"],
    ]);
  });

  it("contexte inconnu : aucune entrée", () => {
    expect(bottomNavItems(resolveClientCapabilities(null), "/espace-client")).toEqual([]);
  });
});
