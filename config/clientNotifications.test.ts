import { describe, expect, it } from "vitest";
import { notificationBadgeLabel, notificationResourceToRoute, notificationVisual } from "./clientNotifications";

describe("notificationBadgeLabel", () => {
  it("masque le badge quand il n'y a aucune non-lue", () => {
    expect(notificationBadgeLabel(0)).toBeNull();
    expect(notificationBadgeLabel(-1)).toBeNull();
  });

  it("affiche le nombre exact jusqu'à 9", () => {
    expect(notificationBadgeLabel(1)).toBe("1");
    expect(notificationBadgeLabel(9)).toBe("9");
  });

  it("affiche 9+ au-delà de 9", () => {
    expect(notificationBadgeLabel(10)).toBe("9+");
    expect(notificationBadgeLabel(42)).toBe("9+");
  });
});

describe("notificationVisual", () => {
  it("associe chaque type connu à une icône dédiée", () => {
    expect(notificationVisual("delivery.assigned").icon).toBe("pi pi-truck");
    expect(notificationVisual("commission.generated").icon).toBe("pi pi-wallet");
    expect(notificationVisual("commission.paid").icon).toBe("pi pi-wallet");
    expect(notificationVisual("commission.missing").icon).toBe("pi pi-exclamation-triangle");
    expect(notificationVisual("expense.validated").icon).toBe("pi pi-receipt");
    expect(notificationVisual("transfer.created").icon).toBe("pi pi-arrow-right-arrow-left");
    expect(notificationVisual("transfer.received").icon).toBe("pi pi-arrow-right-arrow-left");
  });

  it("retombe sur l'icône neutre pour un type inconnu (jamais une icône inventée)", () => {
    expect(notificationVisual("type_inconnu")).toEqual({
      icon: "pi pi-bell",
      background: "bg-surface-100 dark:bg-surface-800",
      iconColor: "text-muted-color",
    });
  });
});

describe("notificationResourceToRoute", () => {
  it("redirige une ressource commande_vente vers Livraisons avec son id réel", () => {
    expect(notificationResourceToRoute({ type: "commande_vente", id: "cmd-123" })).toEqual({
      path: "/espace-client/activite",
      query: { commande: "cmd-123" },
    });
  });

  it("ne redirige pas quand la ressource est absente (jamais un lien cassé)", () => {
    expect(notificationResourceToRoute(null)).toBeNull();
  });

  it("ne redirige aucun autre type de ressource (aucune correspondance connue côté backend)", () => {
    expect(notificationResourceToRoute({ type: "depense", id: "dep-1" })).toBeNull();
  });
});
