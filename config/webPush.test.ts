import { describe, expect, it } from "vitest";
import {
  buildSubscriptionPayload,
  isIosDevice,
  isStandaloneDisplay,
  isWebPushSupported,
  parseWebPushPayload,
  resolveWebPushState,
  urlBase64ToUint8Array,
  webPushNotificationRoute,
  webPushStatePresentation,
} from "./webPush";

const SUPPORTED = { hasServiceWorker: true, hasPushManager: true, hasNotification: true };
const UNSUPPORTED = { hasServiceWorker: false, hasPushManager: true, hasNotification: true };

describe("isWebPushSupported", () => {
  it("exige les 3 API navigateur à la fois", () => {
    expect(isWebPushSupported(SUPPORTED)).toBe(true);
    expect(isWebPushSupported(UNSUPPORTED)).toBe(false);
    expect(isWebPushSupported({ hasServiceWorker: true, hasPushManager: false, hasNotification: true })).toBe(false);
    expect(isWebPushSupported({ hasServiceWorker: true, hasPushManager: true, hasNotification: false })).toBe(false);
  });
});

describe("resolveWebPushState", () => {
  const base = {
    capabilities: SUPPORTED,
    vapidPublicKey: "BN-fake-key",
    permission: "default" as const,
    isSubscribed: false,
    isIosSafariNotStandalone: false,
  };

  it("iOS Safari non installé prime sur tout le reste (message dédié, jamais 'non supporté')", () => {
    expect(resolveWebPushState({ ...base, capabilities: UNSUPPORTED, isIosSafariNotStandalone: true })).toBe("requires_install");
  });

  it("navigateur sans les 3 API -> unsupported", () => {
    expect(resolveWebPushState({ ...base, capabilities: UNSUPPORTED })).toBe("unsupported");
  });

  it("public_key null -> unavailable_server, jamais une erreur", () => {
    expect(resolveWebPushState({ ...base, vapidPublicKey: null })).toBe("unavailable_server");
  });

  it("permission denied -> permission_denied, même si un abonnement existait", () => {
    expect(resolveWebPushState({ ...base, permission: "denied", isSubscribed: true })).toBe("permission_denied");
  });

  it("abonnement existant et synchronisé -> subscribed", () => {
    expect(resolveWebPushState({ ...base, permission: "granted", isSubscribed: true })).toBe("subscribed");
  });

  it("supporté, disponible, permission default ou granted mais pas encore abonné -> not_subscribed", () => {
    expect(resolveWebPushState({ ...base, permission: "default" })).toBe("not_subscribed");
    expect(resolveWebPushState({ ...base, permission: "granted", isSubscribed: false })).toBe("not_subscribed");
  });
});

describe("isIosDevice", () => {
  const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
  const IPAD_LEGACY_UA = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
  const IPADOS_DESKTOP_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15";
  const MAC_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";
  const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0";

  it("détecte iPhone/iPad classiques via le user-agent", () => {
    expect(isIosDevice(IPHONE_UA, 0)).toBe(true);
    expect(isIosDevice(IPAD_LEGACY_UA, 0)).toBe(true);
  });

  it("détecte l'iPadOS 13+ (UA Macintosh) uniquement si tactile", () => {
    expect(isIosDevice(IPADOS_DESKTOP_UA, 5)).toBe(true);
    expect(isIosDevice(MAC_UA, 0)).toBe(false);
  });

  it("ne détecte jamais Android comme iOS", () => {
    expect(isIosDevice(ANDROID_UA, 5)).toBe(false);
  });
});

describe("isStandaloneDisplay", () => {
  it("vrai si le media query standalone matche (Android/desktop)", () => {
    expect(isStandaloneDisplay(true, undefined)).toBe(true);
  });

  it("vrai si navigator.standalone est explicitement true (iOS)", () => {
    expect(isStandaloneDisplay(false, true)).toBe(true);
  });

  it("faux sinon (navigateur classique, PWA non installée)", () => {
    expect(isStandaloneDisplay(false, false)).toBe(false);
    expect(isStandaloneDisplay(false, undefined)).toBe(false);
  });
});

describe("urlBase64ToUint8Array", () => {
  it("convertit une clé base64url connue en Uint8Array attendu", () => {
    // "Hello" en base64url == "SGVsbG8" (sans padding)
    const result = urlBase64ToUint8Array("SGVsbG8");
    expect(Array.from(result)).toEqual([72, 101, 108, 108, 111]);
  });

  it("gère correctement les caractères -/_ propres au base64url", () => {
    // octets [251, 255, 191] -> base64 standard "+/+/" -> base64url "-_-_"
    const result = urlBase64ToUint8Array("-_-_");
    expect(Array.from(result)).toEqual([251, 255, 191]);
  });
});

describe("buildSubscriptionPayload", () => {
  it("extrait endpoint/keys depuis PushSubscription.toJSON()", () => {
    const subscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      toJSON: () => ({ keys: { p256dh: "p256dh-value", auth: "auth-value" } }),
    };
    expect(buildSubscriptionPayload(subscription)).toEqual({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      keys: { p256dh: "p256dh-value", auth: "auth-value" },
    });
  });

  it("renvoie null si les clés de chiffrement sont absentes (jamais envoyé tel quel au backend)", () => {
    const subscription = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", toJSON: () => ({}) };
    expect(buildSubscriptionPayload(subscription)).toBeNull();
  });
});

describe("parseWebPushPayload", () => {
  it("conserve title/body/type/data métier tels quels", () => {
    expect(parseWebPushPayload({ title: "Titre", body: "Corps", type: "commande_vente_validee", commande_id: "cmd-1" })).toEqual({
      title: "Titre",
      body: "Corps",
      type: "commande_vente_validee",
      commande_id: "cmd-1",
    });
  });

  it("retombe sur un titre/corps générique si absents, jamais une exception", () => {
    expect(parseWebPushPayload({})).toEqual({ title: "Eau La Maman", body: "Vous avez une nouvelle notification." });
  });

  it("ne plante jamais sur un payload non-objet (null, chaîne, tableau)", () => {
    expect(parseWebPushPayload(null)).toEqual({ title: "Eau La Maman", body: "Vous avez une nouvelle notification." });
    expect(parseWebPushPayload("texte brut")).toEqual({ title: "Eau La Maman", body: "Vous avez une nouvelle notification." });
    expect(parseWebPushPayload(undefined)).toEqual({ title: "Eau La Maman", body: "Vous avez une nouvelle notification." });
  });
});

describe("webPushNotificationRoute", () => {
  it("commande_vente_validee avec commande_id -> Livraisons, même contrat que la cloche database", () => {
    expect(webPushNotificationRoute({ title: "t", body: "b", type: "commande_vente_validee", commande_id: "cmd-42" })).toEqual({
      path: "/espace-client/activite",
      query: { commande: "cmd-42" },
    });
  });

  it("transfert_created n'a aucune route connue côté Nuxt -> repli espace notifications", () => {
    expect(webPushNotificationRoute({ title: "t", body: "b", type: "transfert_created", transfert_id: "trf-1" })).toEqual({
      path: "/espace-client/notifications",
    });
  });

  it("type inconnu ou absent -> repli, jamais une route fabriquée", () => {
    expect(webPushNotificationRoute({ title: "t", body: "b" })).toEqual({ path: "/espace-client/notifications" });
    expect(webPushNotificationRoute({ title: "t", body: "b", type: "commande_vente_validee" })).toEqual({
      path: "/espace-client/notifications",
    });
  });
});

describe("webPushStatePresentation", () => {
  it("fournit un libellé/description pour chacun des 6 états", () => {
    const states: Array<Parameters<typeof webPushStatePresentation>[0]> = [
      "unsupported",
      "requires_install",
      "unavailable_server",
      "permission_denied",
      "subscribed",
      "not_subscribed",
    ];
    for (const state of states) {
      const presentation = webPushStatePresentation(state);
      expect(presentation.label).toBeTruthy();
      expect(presentation.description).toBeTruthy();
    }
  });

  it("le libellé 'subscribed' est bien 'Activées' (état affiché après abonnement réussi)", () => {
    expect(webPushStatePresentation("subscribed").label).toBe("Activées");
  });
});
