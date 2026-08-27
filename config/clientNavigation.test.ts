import { describe, expect, it } from "vitest";
import { CLIENT_NAV_ITEMS, visibleNavItems } from "./clientNavigation";
import { resolveClientCapabilities } from "./clientCapabilities";

describe("visibleNavItems", () => {
  it("ne retourne que les items dont la capacité est vraie", () => {
    const capabilities = resolveClientCapabilities({
      organization_id: "org-1", client_id: null, proprietaire_id: "prop-1", livreur_id: null, prestataire_id: null,
    });
    const items = visibleNavItems(capabilities);
    expect(items.map((item) => item.key).sort()).toEqual(
      ["commissions", "dashboard", "expenses", "logisticsActivity", "profile", "vehicles"].sort(),
    );
  });

  it("aucune capacité -> aucun item (jamais un menu affiché par défaut)", () => {
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
