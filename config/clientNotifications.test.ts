import { describe, expect, it } from "vitest";
import type { ClientNotification } from "./clientNotifications";
import { notificationActionRoute, notificationBadgeLabel } from "./clientNotifications";

function makeNotification(overrides: Partial<ClientNotification>): ClientNotification {
  return {
    id: "notif-1",
    type: null,
    titre: null,
    message: null,
    data: {},
    lu: false,
    created_at: "2026-08-27T10:00:00Z",
    ...overrides,
  };
}

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

describe("notificationActionRoute", () => {
  it("redirige commande_validee vers Livraisons avec l'id réel de la commande", () => {
    const notification = makeNotification({ type: "commande_validee", data: { commande_id: "cmd-123", reference: "REF-1" } });
    expect(notificationActionRoute(notification)).toEqual({
      path: "/espace-client/activite",
      query: { commande: "cmd-123" },
    });
  });

  it("ne redirige pas commande_validee sans commande_id exploitable (jamais inventé)", () => {
    const notification = makeNotification({ type: "commande_validee", data: { reference: "REF-1" } });
    expect(notificationActionRoute(notification)).toBeNull();
  });

  it("ne redirige aucun autre type (aucune correspondance vérifiée côté backend)", () => {
    expect(notificationActionRoute(makeNotification({ type: "commission_payee", data: { montant: 1000 } }))).toBeNull();
    expect(notificationActionRoute(makeNotification({ type: null }))).toBeNull();
    expect(notificationActionRoute(makeNotification({ type: "type_inconnu" }))).toBeNull();
  });
});
