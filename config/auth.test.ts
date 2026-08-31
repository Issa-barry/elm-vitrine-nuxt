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
  otpFriendlyErrorMessage,
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
  // Revue UX du 31/08/2026 (Nimba SMS + fallback email automatique) : email
  // reste la seule affirmation définitive ("Code envoyé à ...") — un envoi
  // synchrone, sans filet de secours derrière. sms/whatsapp sont asynchrones
  // côté backend (Nimba peut échouer après la réponse HTTP, auquel cas un
  // fallback email avec le même code prend le relais automatiquement) :
  // jamais une affirmation de livraison, seulement une formulation en cours
  // d'envoi + une ligne de secours rassurante.
  it("email : affirmation définitive, jamais de complément de secours (envoi déjà garanti)", () => {
    const presentation = otpChannelPresentation("email");
    expect(presentation.heading).toBe("Vérifiez votre email");
    expect(presentation.destinationLine("j***@example.com")).toBe("Code envoyé à j***@example.com");
    expect(presentation.fallbackHint).toBeUndefined();
  });

  it("sms : formulation prudente (jamais \"envoyé\"/\"avec succès\"), avec complément de secours email", () => {
    const presentation = otpChannelPresentation("sms");
    const line = presentation.destinationLine("+224 6•• •• •• 12");
    expect(line).toBe("Nous envoyons votre code par SMS au +224 6•• •• •• 12.");
    expect(line).not.toMatch(/envoyé/i);
    expect(line).not.toMatch(/succès/i);
    expect(presentation.fallbackHint).toMatch(/email/i);
  });

  it("whatsapp : même prudence que sms (canal asynchrone), même complément de secours", () => {
    const presentation = otpChannelPresentation("whatsapp");
    expect(presentation.destinationLine("+224 6•• •• •• 12")).not.toMatch(/envoyé/i);
    expect(presentation.fallbackHint).toMatch(/email/i);
  });

  it("fonctionne sans refonte pour whatsapp/sms même si un seul est réellement opérationnel aujourd'hui", () => {
    // Le contrat est traité comme un enum ouvert (jamais `channel === 'email'`
    // comme condition) : ces deux canaux doivent déjà avoir une présentation
    // correcte, même si whatsapp n'est pas encore opérationnel côté backend.
    expect(otpChannelPresentation("whatsapp").heading).not.toBe(otpChannelPresentation("email").heading);
    expect(otpChannelPresentation("sms").heading).not.toBe(otpChannelPresentation("email").heading);
  });
});

describe("otpFriendlyErrorMessage", () => {
  it("remplace un message de panne serveur (5xx) par un texte générique, jamais une trace Laravel/Nimba brute", () => {
    const message = otpFriendlyErrorMessage({ status: 500, message: "SQLSTATE[HY000]: General error, Nimba timeout" });
    expect(message).toBe("Impossible d'envoyer le code pour le moment. Réessayez dans quelques instants.");
  });

  it("remplace aussi une erreur réseau (normalizeAuthError la replie déjà sur status 500)", () => {
    const message = otpFriendlyErrorMessage(normalizeAuthError(new Error("network down")));
    expect(message).toBe("Impossible d'envoyer le code pour le moment. Réessayez dans quelques instants.");
  });

  it("laisse passer inchangé un message déjà pensé pour l'utilisateur (4xx, ex. code incorrect)", () => {
    expect(otpFriendlyErrorMessage({ status: 422, message: "Code incorrect ou expiré." })).toBe("Code incorrect ou expiré.");
    expect(otpFriendlyErrorMessage({ status: 429, message: "Trop de tentatives. Demandez un nouveau code." })).toBe(
      "Trop de tentatives. Demandez un nouveau code.",
    );
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
