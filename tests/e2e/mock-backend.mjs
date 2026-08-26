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

app.use(router);

const port = Number(process.env.MOCK_BACKEND_PORT || 8100);
createServer(toNodeListener(app)).listen(port, () => {
  console.log(`[mock-backend] listening on http://localhost:${port}`);
});
