import { describe, expect, it } from "vitest";
import {
  DEVICE_NAME,
  buildLoginPayload,
  buildOtpVerifyPayload,
  clientSpaceRoleLabel,
  hasClientSpaceAccess,
  isAccountStatusCode,
  normalizeAuthError,
  otpChannelPresentation,
  resolveMonolithBaseUrl,
  shouldUseSecureCookies,
} from "./auth";

describe("clientSpaceRoleLabel", () => {
  it("priorité proprietaire > client > livreur en cas de cumul (même ordre que profile.type backend)", () => {
    expect(clientSpaceRoleLabel(["client", "proprietaire"])).toBe("Propriétaire");
    expect(clientSpaceRoleLabel(["manager", "client"])).toBe("Client");
    expect(clientSpaceRoleLabel(["comptable", "livreur"])).toBe("Livreur");
  });

  it("compte staff pur (sans rôle espace client) : libellé neutre, jamais un rôle inventé", () => {
    expect(clientSpaceRoleLabel(["super_admin"])).toBe("Compte");
    expect(clientSpaceRoleLabel(null)).toBe("Compte");
    expect(clientSpaceRoleLabel(undefined)).toBe("Compte");
  });
});

describe("buildLoginPayload", () => {
  it("ajoute device_name sans jamais le laisser au choix de l'appelant", () => {
    const payload = buildLoginPayload({ telephone: "+224620000100", password: "secret" });
    expect(payload).toEqual({
      telephone: "+224620000100",
      password: "secret",
      device_name: DEVICE_NAME,
    });
  });

  it("device_name identifie ce client précisément (contrat backend)", () => {
    expect(DEVICE_NAME).toBe("elm-nuxt-web");
  });
});

describe("buildOtpVerifyPayload", () => {
  it("ajoute device_name sans jamais le laisser au choix de l'appelant", () => {
    const payload = buildOtpVerifyPayload({ telephone: "+224620000100", code: "123456" });
    expect(payload).toEqual({
      telephone: "+224620000100",
      code: "123456",
      device_name: DEVICE_NAME,
    });
  });
});

describe("otpChannelPresentation", () => {
  it("propose un libellé et un préfixe de destination distincts par canal (jamais un if/else dispersé côté page)", () => {
    expect(otpChannelPresentation("email")).toEqual({ heading: "Vérifiez votre email", destinationPrefix: "Code envoyé à" });
    expect(otpChannelPresentation("whatsapp")).toEqual({ heading: "Vérifiez WhatsApp", destinationPrefix: "Code envoyé au" });
    expect(otpChannelPresentation("sms")).toEqual({ heading: "Vérifiez vos SMS", destinationPrefix: "Code envoyé au" });
  });

  it("fonctionne sans refonte pour whatsapp/sms même désactivés dans l'UI aujourd'hui", () => {
    // Le contrat est traité comme un enum ouvert (jamais `channel === 'email'`
    // comme condition) : ces deux canaux doivent déjà avoir une présentation
    // correcte, même si aucun bouton actif ne les déclenche encore.
    expect(otpChannelPresentation("whatsapp").heading).not.toBe(otpChannelPresentation("email").heading);
    expect(otpChannelPresentation("sms").heading).not.toBe(otpChannelPresentation("email").heading);
  });
});

describe("resolveMonolithBaseUrl", () => {
  it("préfère monolithApiBase (serveur-only) à public.apiBase", () => {
    const url = resolveMonolithBaseUrl({
      monolithApiBase: "https://fello.eau-la-maman.com",
      public: { apiBase: "https://autre.example" },
    });
    expect(url).toBe("https://fello.eau-la-maman.com");
  });

  it("retombe sur public.apiBase si monolithApiBase est vide", () => {
    const url = resolveMonolithBaseUrl({ monolithApiBase: "", public: { apiBase: "http://localhost:8000" } });
    expect(url).toBe("http://localhost:8000");
  });

  it("retire un slash final éventuel", () => {
    expect(resolveMonolithBaseUrl({ monolithApiBase: "http://localhost:8000/" })).toBe("http://localhost:8000");
  });

  it("retourne une chaîne vide si rien n'est configuré", () => {
    expect(resolveMonolithBaseUrl({})).toBe("");
  });
});

describe("shouldUseSecureCookies", () => {
  it("désactive Secure uniquement en local (http)", () => {
    expect(shouldUseSecureCookies("local")).toBe(false);
  });

  it("active Secure sur tous les autres environnements (HTTPS)", () => {
    expect(shouldUseSecureCookies("preprod")).toBe(true);
    expect(shouldUseSecureCookies("recette")).toBe(true);
    expect(shouldUseSecureCookies("production")).toBe(true);
  });
});

describe("hasClientSpaceAccess", () => {
  it("autorise un compte avec le rôle client, proprietaire ou livreur", () => {
    expect(hasClientSpaceAccess(["client"])).toBe(true);
    expect(hasClientSpaceAccess(["proprietaire"])).toBe(true);
    expect(hasClientSpaceAccess(["livreur"])).toBe(true);
  });

  it("refuse un compte staff/admin/super_admin sans aucun de ces 3 rôles", () => {
    expect(hasClientSpaceAccess(["admin"])).toBe(false);
    expect(hasClientSpaceAccess(["super_admin"])).toBe(false);
    expect(hasClientSpaceAccess(["staff"])).toBe(false);
  });

  it("autorise un compte double-rôle (ex. staff ET client), même règle OR que le backend", () => {
    expect(hasClientSpaceAccess(["admin", "client"])).toBe(true);
  });

  // Matrice de cumul de rôles confirmée côté backend le 26/08/2026
  // (App\Models\User::hasBackofficeAccess()/hasClientAccess(),
  // 117/117 tests backend verts) : les rôles staff et espace client ne
  // s'excluent JAMAIS. Un rôle staff supplémentaire ne retire jamais l'accès
  // espace client — voir aussi composables/useAuth.ts::login().
  it("autorise toutes les combinaisons staff + rôle espace client (matrice backend)", () => {
    expect(hasClientSpaceAccess(["admin_entreprise", "proprietaire"])).toBe(true);
    expect(hasClientSpaceAccess(["manager", "client"])).toBe(true);
    expect(hasClientSpaceAccess(["comptable", "livreur"])).toBe(true);
  });

  it("autorise un rôle personnalisé d'organisation cumulé à un rôle espace client, sans connaître son nom à l'avance", () => {
    // hasClientSpaceAccess ne connaît que CLIENT_SPACE_ROLES : peu importe le
    // nom du rôle staff (système ou personnalisé via RoleController côté
    // backend), sa seule présence n'entre jamais en jeu ici — exactement
    // comme User::hasClientAccess() (intersect(EXTERNAL_ROLES)) côté backend.
    expect(hasClientSpaceAccess(["responsable-logistique-abidjan", "proprietaire"])).toBe(true);
  });

  it("refuse une liste de rôles vide, absente ou nulle", () => {
    expect(hasClientSpaceAccess([])).toBe(false);
    expect(hasClientSpaceAccess(undefined)).toBe(false);
    expect(hasClientSpaceAccess(null)).toBe(false);
  });
});

describe("isAccountStatusCode", () => {
  it("reconnaît les 3 codes du contrat backend", () => {
    expect(isAccountStatusCode("pending_validation")).toBe(true);
    expect(isAccountStatusCode("account_blocked")).toBe(true);
    expect(isAccountStatusCode("email_not_verified")).toBe(true);
  });

  it("rejette tout le reste", () => {
    expect(isAccountStatusCode("blocked")).toBe(false);
    expect(isAccountStatusCode(undefined)).toBe(false);
  });
});

describe("normalizeAuthError", () => {
  it("déballe une erreur 422 relayée par un handler server/api/auth/* (double imbrication data.data)", () => {
    const error = {
      statusCode: 422,
      statusMessage: "The given data was invalid.",
      data: {
        statusCode: 422,
        data: {
          message: "Les données sont invalides.",
          errors: { telephone: ["Les identifiants fournis sont incorrects."] },
        },
      },
    };

    const result = normalizeAuthError(error);

    expect(result.status).toBe(422);
    expect(result.message).toBe("Les données sont invalides.");
    expect(result.fieldErrors).toEqual({ telephone: "Les identifiants fournis sont incorrects." });
  });

  it("déballe une erreur 403 avec un code de statut de compte", () => {
    const error = {
      statusCode: 403,
      data: {
        data: {
          message: "Votre compte a été désactivé. Veuillez contacter notre service client pour plus d'informations.",
          code: "account_blocked",
        },
      },
    };

    const result = normalizeAuthError(error);

    expect(result.status).toBe(403);
    expect(result.code).toBe("account_blocked");
    expect(result.fieldErrors).toBeUndefined();
  });

  it("gère une erreur H3 'plate' (data directement, sans imbrication)", () => {
    const error = { statusCode: 503, data: { message: "Service d'authentification non configuré." } };
    const result = normalizeAuthError(error);
    expect(result.message).toBe("Service d'authentification non configuré.");
  });

  it("retombe sur un message générique si rien d'exploitable n'est présent", () => {
    const result = normalizeAuthError(new Error("network down"));
    expect(result.message).toBe("Une erreur est survenue. Veuillez réessayer.");
    expect(result.status).toBe(500);
  });

  it("prend le premier message d'un tableau d'erreurs de validation", () => {
    const error = { statusCode: 422, data: { data: { errors: { password: ["Trop court.", "Ignoré."] } } } };
    const result = normalizeAuthError(error);
    expect(result.fieldErrors).toEqual({ password: "Trop court." });
  });

  // Anti-spam OTP (HasOtpRateLimitResponse côté backend, voir
  // OtpLogin\RequestController) : 429 sur /otp-login/request porte
  // `retry_after_seconds`, jamais une valeur devinée côté Nuxt (voir
  // composables/useOtpLogin.ts).
  it("extrait retryAfterSeconds d'un 429 anti-spam OTP", () => {
    const error = {
      statusCode: 429,
      data: { data: { error: "Vous avez demandé trop de codes. Réessayez dans 1 minute.", retry_after_seconds: 42 } },
    };
    const result = normalizeAuthError(error);
    expect(result.status).toBe(429);
    expect(result.retryAfterSeconds).toBe(42);
  });

  it("retryAfterSeconds reste undefined quand le backend ne le fournit pas (pas de 0 par défaut trompeur)", () => {
    const result = normalizeAuthError({ statusCode: 422, data: { data: { error: "Code incorrect ou expiré." } } });
    expect(result.retryAfterSeconds).toBeUndefined();
  });
});
