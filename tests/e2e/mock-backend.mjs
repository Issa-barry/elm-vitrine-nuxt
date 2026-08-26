// Backend Laravel minimal simulé, réservé aux tests E2E (voir
// playwright.config.ts) — jamais utilisé par l'application réelle (aucun
// code de elm-vitrine-nuxt hors tests/ n'importe ce fichier). Depuis la
// décision du 26/08/2026 ("aucun bypass d'auth runtime, même en dev"),
// pages/connexion.vue, pages/inscription.vue et pages/mot-de-passe-oublie.vue
// appellent réellement leurs endpoints /api/auth/* — ce serveur leur donne
// donc de vraies réponses HTTP à traiter, avec le même contrat JSON que
// elm-monolithe (voir docs/api-auth-contract.md côté ce dépôt), plutôt que de
// mocker au niveau du composant (isUiPreview, supprimé).
//
// Implémente seulement le sous-ensemble du contrat nécessaire à la suite E2E
// existante — pas une réimplémentation de elm-monolithe. Utilise h3 (déjà une
// dépendance de Nitro/ce projet) + le serveur http natif de Node : aucune
// nouvelle dépendance ajoutée.
import { createServer } from "node:http";
import {
  createApp,
  createError,
  createRouter,
  defineEventHandler,
  getHeader,
  readBody,
  toNodeListener,
} from "h3";

export const TEST_TELEPHONE = "+224601020304";
export const TEST_PASSWORD = "MotDePasse123";
const TEST_TOKEN = "e2e-mock-token";

const TEST_USER = {
  id: "e2e-user-1",
  prenom: "Test",
  nom: "E2E",
  telephone: TEST_TELEPHONE,
  email: "test-e2e@example.com",
  roles: ["client"],
  is_active: true,
  qr_payload: null,
};

const app = createApp();
const router = createRouter();

// Route de disponibilité pour la sonde webServer.url de playwright.config.ts
// (probablement un GET / attendant un statut 2xx) — sans elle, ce routeur
// n'ayant aucune route sur "/", Playwright considère le serveur "jamais prêt"
// jusqu'à expiration de son propre timeout.
router.get("/", defineEventHandler(() => ({ status: "ok" })));

// ── Auth ─────────────────────────────────────────────────────────────────
router.post(
  "/api/auth/login",
  defineEventHandler(async (event) => {
    const body = await readBody(event);
    if (body?.telephone === TEST_TELEPHONE && body?.password === TEST_PASSWORD) {
      return { token: TEST_TOKEN, user: TEST_USER };
    }

    throw createError({
      statusCode: 422,
      statusMessage: "Les identifiants fournis sont incorrects.",
      data: {
        message: "Les identifiants fournis sont incorrects.",
        errors: { telephone: ["Les identifiants fournis sont incorrects."] },
      },
    });
  }),
);

router.get(
  "/api/auth/me",
  defineEventHandler((event) => {
    const authHeader = getHeader(event, "authorization");
    if (authHeader !== `Bearer ${TEST_TOKEN}`) {
      throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
    }

    return {
      ...TEST_USER,
      context: { organization_id: "org-e2e", client_id: "client-e2e", proprietaire_id: null, livreur_id: null },
    };
  }),
);

router.post("/api/auth/logout", defineEventHandler(() => ({ message: "Déconnecté avec succès." })));
router.post("/api/auth/logout-all", defineEventHandler(() => ({ message: "Déconnecté de tous les appareils." })));

// ── Inscription ──────────────────────────────────────────────────────────
router.post(
  "/api/auth/register/check-phone",
  defineEventHandler(async (event) => {
    const body = await readBody(event);
    if (body?.telephone === TEST_TELEPHONE) {
      return { status: "user_exists", prefill: null };
    }
    return { status: "not_found", prefill: null };
  }),
);

router.post(
  "/api/auth/register",
  defineEventHandler(async (event) => {
    const body = await readBody(event);
    return {
      message: "Compte créé.",
      user: {
        id: "e2e-new-user",
        prenom: body?.prenom || "",
        nom: body?.nom || "",
        telephone: body?.telephone || "",
        email: null,
        status: "pending",
        is_active: false,
        roles: ["client"],
      },
    };
  }),
);

// ── Mot de passe oublié ──────────────────────────────────────────────────
router.post(
  "/api/auth/password/lookup",
  defineEventHandler(() => ({ masked_email: "t***@example.com" })),
);
router.post("/api/auth/password/verify", defineEventHandler(() => ({ message: "Code vérifié." })));
router.post("/api/auth/password/reset", defineEventHandler(() => ({ message: "Mot de passe modifié." })));

// ── Espace client (contrat vérifié le 26/08/2026 contre le code réel de
// elm-monolithe — voir config/clientProfile.ts, config/clientVehicles.ts) ──
function requireTestToken(event) {
  const authHeader = getHeader(event, "authorization");
  if (authHeader !== `Bearer ${TEST_TOKEN}`) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }
}

// État mutable en mémoire : permet de tester un vrai cycle GET -> PATCH ->
// GET dans un test E2E, comme le ferait le vrai backend. type: "client" pour
// rester cohérent avec TEST_USER.roles (["client"]) et le context.client_id
// renvoyé par /api/auth/me ci-dessus — jamais deux profils différents pour le
// même compte de test.
const profileState = {
  type: "client",
  identite: { prenom: "Test", nom: "E2E", surnom: null, nom_affichage: "Test E2E" },
  entreprise: null,
  contact: { telephone: TEST_TELEPHONE, email: "test-e2e@example.com" },
  localisation: { pays: "Guinée", code_pays: "GN", code_phone_pays: "+224", ville: "Conakry", adresse: null },
  actif: true,
  notifications: { activite: true },
};

router.get(
  "/api/v1/mobile/profile",
  defineEventHandler((event) => {
    requireTestToken(event);
    return { user: { id: TEST_USER.id, telephone: TEST_USER.telephone, email: TEST_USER.email }, profile: profileState };
  }),
);

router.patch(
  "/api/v1/mobile/profile",
  defineEventHandler(async (event) => {
    requireTestToken(event);
    const body = await readBody(event);
    // Même filtre que UpdateProfileRequest côté backend : seuls ces 4 champs.
    for (const key of ["pays", "code_pays", "ville", "adresse"]) {
      if (key in (body || {})) profileState.localisation[key] = body[key];
    }
    return { user: { id: TEST_USER.id, telephone: TEST_USER.telephone, email: TEST_USER.email }, profile: profileState };
  }),
);

router.patch(
  "/api/v1/mobile/profile/notification-preferences",
  defineEventHandler(async (event) => {
    requireTestToken(event);
    const body = await readBody(event);
    if (body?.preferences && "activite" in body.preferences) {
      profileState.notifications.activite = Boolean(body.preferences.activite);
    }
    return { notifications: profileState.notifications };
  }),
);

const TEST_VEHICLES = [
  {
    id: "veh-1",
    nom: "ABARRY",
    immatriculation: "OU3859",
    type: "Camion",
    capacite: 500,
    is_active: true,
    photo_url: null,
    en_livraison: false,
    role: "proprietaire",
    conducteur: "Mamadou D.",
  },
  {
    id: "veh-2",
    nom: "ABARRY 2",
    immatriculation: "OU4217",
    type: "Minibus",
    capacite: null,
    is_active: false,
    photo_url: null,
    en_livraison: true,
    role: "proprietaire",
    conducteur: null,
  },
];

router.get(
  "/api/v1/mobile/vehicules/mine",
  defineEventHandler((event) => {
    requireTestToken(event);
    return TEST_VEHICLES;
  }),
);

app.use(router);

const port = Number(process.env.MOCK_BACKEND_PORT || 8100);
createServer(toNodeListener(app)).listen(port, () => {
  console.log(`[mock-backend] listening on http://localhost:${port}`);
});
