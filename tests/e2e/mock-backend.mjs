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
  getQuery,
  getRouterParam,
  readBody,
  setResponseStatus,
  toNodeListener,
} from "h3";

export const TEST_TELEPHONE = "+224601020304";
export const TEST_PASSWORD = "MotDePasse123";
const TEST_TOKEN = "e2e-mock-token";

// roles cumulés (client + proprietaire) : comportement réel supporté côté
// backend depuis le 26/08/2026 (App\Models\User::hasBackofficeAccess()/
// hasClientAccess()) — nécessaire pour exercer dashboard/dépenses/activité
// (orientés proprietaire/livreur, context.proprietaire_id) tout en gardant
// les tests profil/vehicules existants valides (context.client_id inchangé).
const TEST_USER = {
  id: "e2e-user-1",
  prenom: "Test",
  nom: "E2E",
  telephone: TEST_TELEPHONE,
  email: "test-e2e@example.com",
  roles: ["client", "proprietaire"],
  is_active: true,
  qr_payload: "https://fello.eau-la-maman.com/proprietaires/e2e-user-1",
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
      context: { organization_id: "org-e2e", client_id: "client-e2e", proprietaire_id: "proprietaire-e2e", livreur_id: null },
    };
  }),
);

router.post("/api/auth/logout", defineEventHandler(() => ({ message: "Déconnecté avec succès." })));
router.post("/api/auth/logout-all", defineEventHandler(() => ({ message: "Déconnecté de tous les appareils." })));

// ── Connexion sans mot de passe par OTP (chantier du 27/08/2026) ───────────
// Contrat vérifié contre App\Http\Controllers\Api\Auth\OtpLogin\
// {RequestController,VerifyController} côté elm-monolithe — voir
// config/auth.ts. Numéros dédiés par scénario (même convention que le reste
// de ce fichier, ex. inscription "toujours not_found" plus haut) : le
// numéro RÉEL de connexion (TEST_TELEPHONE) reste le seul chemin de succès,
// les autres déclenchent chacun un statut précis, jamais une simulation
// complète du rate-limiting réel (5 tentatives) — inutilement lent pour ce
// que le front doit exactement vérifier (le traitement du statut HTTP).
export const OTP_TELEPHONE_NOT_FOUND = "+224699999999";
export const OTP_TELEPHONE_RATE_LIMITED = "+224688888888";
export const OTP_TELEPHONE_UNAVAILABLE = "+224677777777";
export const OTP_CODE_VALID = "111111";
export const OTP_CODE_LOCKED = "000000"; // déclenche directement le 429 "Trop de tentatives"
export const OTP_DESTINATION_MASKED = "j***@example.com";

// setResponseStatus(event, code) + return {...}, PAS createError(...) : un
// createError() ici serait sérialisé par h3 dans SON PROPRE enveloppe
// ({statusCode, statusMessage, stack, data}), que callMonolith.ts englobe
// à son tour dans une deuxième enveloppe identique en la relayant — deux
// niveaux d'imbrication qui n'existent PAS avec le vrai Laravel (qui renvoie
// le JSON directement, sans enveloppe h3). Bug réel trouvé le 27/08/2026 en
// écrivant les tests OTP (les 3 tests d'erreur échouaient : le message/
// retry_after_seconds attendus étaient imbriqués un niveau plus loin que ce
// que normalizeAuthError() (config/auth.ts) sait déballer — lequel reste
// correct pour le VRAI Laravel, jamais modifié pour ce simple artefact de
// mock). Toutes les routes ci-dessous suivent donc désormais la forme réelle
// (réponse JSON plate + code HTTP), pas le raccourci createError() utilisé
// ailleurs dans ce fichier pour des routes jamais exercées via un vrai
// aller-retour BFF -> mock (toujours court-circuitées par page.route() côté
// spec, voir tests/e2e/connexion.spec.ts).
router.post(
  "/api/auth/otp-login/request",
  defineEventHandler(async (event) => {
    const body = await readBody(event);
    const telephone = body?.telephone;

    if (telephone === OTP_TELEPHONE_RATE_LIMITED) {
      setResponseStatus(event, 429);
      return { error: "Vous avez demandé trop de codes. Réessayez dans 1 minute.", retry_after_seconds: 42 };
    }
    if (telephone === OTP_TELEPHONE_UNAVAILABLE) {
      setResponseStatus(event, 503);
      return { error: "Aucun canal disponible pour recevoir un code de connexion pour le moment." };
    }
    if (telephone !== TEST_TELEPHONE) {
      // Couvre OTP_TELEPHONE_NOT_FOUND et tout autre numéro non enregistré.
      setResponseStatus(event, 404);
      return { error: "Aucun compte trouvé pour ce numéro de téléphone." };
    }

    return { sent: true, channel: "email", destination_masked: OTP_DESTINATION_MASKED, cooldown_seconds: 30 };
  }),
);

router.post(
  "/api/auth/otp-login/verify",
  defineEventHandler(async (event) => {
    const body = await readBody(event);

    if (body?.code === OTP_CODE_LOCKED) {
      setResponseStatus(event, 429);
      return { error: "Trop de tentatives. Demandez un nouveau code." };
    }
    if (body?.telephone === TEST_TELEPHONE && body?.code === OTP_CODE_VALID) {
      return { token: TEST_TOKEN, user: TEST_USER };
    }

    setResponseStatus(event, 422);
    return { error: "Code incorrect ou expiré." };
  }),
);

// ── Inscription ──────────────────────────────────────────────────────────
// Toujours "not_found" : tests/e2e/inscription.spec.ts utilise volontairement
// le même numéro que TEST_TELEPHONE (601020304, un numéro guinéen plausible
// quelconque) sans lien avec le compte de connexion simulé ici — un
// "user_exists" bloquerait son parcours d'inscription dès l'étape 1.
router.post(
  "/api/auth/register/check-phone",
  defineEventHandler(async () => {
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

// ── Web Push (chantier du 28/08/2026, voir docs/pwa.md § Web Push) ─────────
// Clé factice fixe (jamais utilisée pour un vrai PushManager.subscribe() en
// E2E : `pwa.devOptions.enabled: false` désactive le service worker en `nuxt
// dev`, voir tests/e2e/pwa.spec.ts) — suffisante pour exercer l'état "carte
// visible, bouton Activer" côté UI (tests/e2e/web-push.spec.ts), sans
// prétendre tester un abonnement réel.
router.get(
  "/api/v1/mobile/web-push/vapid-public-key",
  defineEventHandler((event) => {
    requireTestToken(event);
    return { public_key: "BPfakeE2EVapidPublicKeyNeverUsedForRealSubscribe0000000000000" };
  }),
);

router.post(
  "/api/v1/mobile/web-push/subscriptions",
  defineEventHandler((event) => {
    requireTestToken(event);
    return { success: true };
  }),
);

router.delete(
  "/api/v1/mobile/web-push/subscriptions",
  defineEventHandler((event) => {
    requireTestToken(event);
    return { success: true };
  }),
);

// equipe[]/capacites[]/proprietaire/statut : contrat réel enrichi le
// 27/08/2026 côté elm-monolithe (App\Http\Controllers\Api\Client\
// VehiculesController, vérifié directement dans le code + ses 11 tests) —
// conducteur/capacite conservés en compat descendante, jamais lus par le
// front tant que equipe[]/capacites[] ne sont pas vides (voir
// pages/espace-client/vehicules.vue). veh-1 a une équipe/capacité/propriétaire
// complets (cas riche) ; veh-2 n'a ni équipe ni capacité ni propriétaire
// (cas "replis", véhicule sans propriétaire renseigné) — les deux cas sont
// couverts par tests/e2e/vehicules.spec.ts.
const TEST_VEHICLES = [
  {
    id: "veh-1",
    nom: "ABARRY",
    immatriculation: "OU3859",
    type: "Camion",
    statut: "actif",
    capacite: null,
    is_active: true,
    photo_url: null,
    en_livraison: false,
    role: "proprietaire",
    conducteur: "Mamadou Diallo",
    proprietaire: { id: "prop-1", nom_complet: "Issa Barry", telephone: "+224620010203" },
    equipe: [
      { id: "liv-1", nom_complet: "Mamadou Diallo", telephone: "+224620111222", role: "chauffeur", ordre: 0 },
      { id: "liv-2", nom_complet: "Ibrahima Sow", telephone: "+224620333444", role: "convoyeur", ordre: 1 },
    ],
    capacites: [
      { categorie_id: "cat-1", categorie: "Sachet eau", capacite: 800 },
      { categorie_id: "cat-2", categorie: "Bouteille", capacite: 540 },
    ],
  },
  {
    id: "veh-2",
    nom: "ABARRY 2",
    immatriculation: "OU4217",
    type: "Minibus",
    statut: "inactif",
    capacite: null,
    is_active: false,
    photo_url: null,
    en_livraison: true,
    role: "proprietaire",
    conducteur: null,
    proprietaire: null,
    equipe: [],
    capacites: [],
  },
];

router.get(
  "/api/v1/mobile/vehicules/mine",
  defineEventHandler((event) => {
    requireTestToken(event);
    return TEST_VEHICLES;
  }),
);

// Commissions par véhicule (contrat vérifié le 27/08/2026 contre le code réel
// de App\Http\Controllers\Api\Client\VehiculeCommissionsController — voir
// config/clientCommissions.ts). Scopé à un seul véhicule à la fois, comme le
// vrai backend : /espace-client/commissions (composables/useClientCommissions.ts)
// appelle cette route une fois par véhicule de TEST_VEHICLES et fusionne.
const TEST_COMMISSIONS_BY_VEHICULE = {
  "veh-1": [
    { id: "comm-1", reference: "CMD-2847", date: "2026-08-20T00:00:00.000Z", montant_net: 50_000, montant_a_payer: 50_000, montant_verse: 50_000, montant_restant: 0, statut: "paye", mois: "Août 2026" },
    { id: "comm-2", reference: "CMD-2820", date: "2026-07-15T00:00:00.000Z", montant_net: 42_000, montant_a_payer: 42_000, montant_verse: 20_000, montant_restant: 22_000, statut: "partiel", mois: "Juillet 2026" },
  ],
  "veh-2": [
    { id: "comm-3", reference: "CMD-2839", date: "2026-08-17T00:00:00.000Z", montant_net: 38_000, montant_a_payer: 38_000, montant_verse: 0, montant_restant: 38_000, statut: "en_attente", mois: "Août 2026" },
  ],
};

router.get(
  "/api/v1/mobile/vehicules/:vehiculeId/commissions",
  defineEventHandler((event) => {
    requireTestToken(event);
    const vehiculeId = getRouterParam(event, "vehiculeId");
    // Même comportement que le vrai backend : véhicule inconnu -> 404,
    // véhicule connu mais sans commission -> liste vide (jamais un 404).
    if (!TEST_VEHICLES.some((v) => v.id === vehiculeId)) {
      throw createError({ statusCode: 404, statusMessage: "Véhicule introuvable." });
    }
    return TEST_COMMISSIONS_BY_VEHICULE[vehiculeId] || [];
  }),
);

// ── Dashboard / dépenses / activité (contrat vérifié le 26/08/2026 contre le
// code réel de elm-monolithe — voir config/clientDashboard.ts,
// clientExpenses.ts, clientActivity.ts) ─────────────────────────────────────

// Deux véhicules identiques (immatriculation) à TEST_VEHICLES ci-dessus, mais
// `nom_vehicule` (pas `nom`) : forme de resource différente par endpoint côté
// backend réel, jamais harmonisée arbitrairement ici non plus.
const DASHBOARD_VEHICULES = [
  { id: "veh-1", nom_vehicule: "ABARRY", immatriculation: "OU3859" },
  { id: "veh-2", nom_vehicule: "ABARRY 2", immatriculation: "OU4217" },
];

// Décomposition par véhicule cohérente avec le total (voir commentaire sur
// GET /api/v1/mobile/dashboard plus bas) : la somme des deux lignes doit
// toujours égaler `summary`. Deux jeux de valeurs distincts par période
// (ce_mois/mois_passe), nécessaire pour que la variation calculée par
// pages/espace-client/index.vue (GET ...?period=mois_passe en comparaison)
// soit réellement non nulle dans les tests (voir tests/e2e/dashboard-kpi.spec.ts) —
// un backend réel varie naturellement d'une période à l'autre, cette
// distinction reproduit ça plutôt que d'aplatir les deux périodes sur les
// mêmes montants (ce qui donnerait 0% partout, un faux négatif du test
// "pas de pourcentage inventé").
// Valeurs volontairement toutes distinctes les unes des autres (summary ET
// par_vehicule, même période) : un montant de ligne identique à un montant
// de summary (coïncidence arithmétique pure, ex. balance totale == total_earned
// d'un seul véhicule) crée un texte affiché deux fois dans
// .client-desktop-dashboard, ce que Playwright refuse en mode strict
// (getByText(...) doit résoudre un élément unique) — voir l'échec initial de
// tests/e2e/dashboard-kpi.spec.ts avant ce correctif.
// Une entrée par valeur RÉELLE de `period` (voir docs/api-espace-client-
// contract.md §5 côté elm-monolithe : 7j/30j/ce_mois/mois_passe/custom) —
// jamais un repli silencieux sur ce_mois pour les autres (masquerait un vrai
// changement de période dans les tests, voir tests/e2e/commissions.spec.ts
// "changement de période"). `custom` volontairement vide : sert de scénario
// "0 commission" réaliste (ex. filtre "Aujourd'hui", une seule journée sans
// vente n'a rien d'anormal) plutôt que de fabriquer un troisième jeu de
// montants juste pour avoir une valeur.
const DASHBOARD_PAR_VEHICULE_BY_PERIOD = {
  ce_mois: [
    { vehicule_id: "veh-1", nom_vehicule: "ABARRY", immatriculation: "OU3859", frais_depenses: 410_000, total_earned: 2_760_000, total_paid: 1_790_000, balance: 970_000, operations: 3 },
    { vehicule_id: "veh-2", nom_vehicule: "ABARRY 2", immatriculation: "OU4217", frais_depenses: 205_000, total_earned: 1_480_000, total_paid: 960_000, balance: 520_000, operations: 3 },
  ],
  mois_passe: [
    { vehicule_id: "veh-1", nom_vehicule: "ABARRY", immatriculation: "OU3859", frais_depenses: 395_000, total_earned: 2_480_000, total_paid: 1_610_000, balance: 870_000, operations: 2 },
    { vehicule_id: "veh-2", nom_vehicule: "ABARRY 2", immatriculation: "OU4217", frais_depenses: 178_000, total_earned: 1_260_000, total_paid: 820_000, balance: 440_000, operations: 2 },
  ],
  "7j": [
    { vehicule_id: "veh-1", nom_vehicule: "ABARRY", immatriculation: "OU3859", frais_depenses: 90_000, total_earned: 980_000, total_paid: 500_000, balance: 480_000, operations: 1 },
    { vehicule_id: "veh-2", nom_vehicule: "ABARRY 2", immatriculation: "OU4217", frais_depenses: 45_000, total_earned: 520_000, total_paid: 260_000, balance: 260_000, operations: 1 },
  ],
  "30j": [
    { vehicule_id: "veh-1", nom_vehicule: "ABARRY", immatriculation: "OU3859", frais_depenses: 210_000, total_earned: 2_100_000, total_paid: 1_300_000, balance: 800_000, operations: 2 },
    { vehicule_id: "veh-2", nom_vehicule: "ABARRY 2", immatriculation: "OU4217", frais_depenses: 105_000, total_earned: 1_050_000, total_paid: 650_000, balance: 400_000, operations: 2 },
  ],
  custom: [],
};

router.get(
  "/api/v1/mobile/dashboard",
  defineEventHandler((event) => {
    requireTestToken(event);
    const query = getQuery(event);
    const vehiculeId = query.vehicule_id || null;
    const period = query.period || "ce_mois";
    const source = DASHBOARD_PAR_VEHICULE_BY_PERIOD[period] ?? DASHBOARD_PAR_VEHICULE_BY_PERIOD.ce_mois;

    // Même règle que le vrai backend (docs/api-espace-client-contract.md §5) :
    // par_vehicule liste TOUJOURS le parc complet, seuls les montants sont
    // restreints au véhicule filtré (les autres tombent à 0).
    const parVehicule = source.map((v) =>
      vehiculeId && v.vehicule_id !== vehiculeId
        ? { ...v, frais_depenses: 0, total_earned: 0, total_paid: 0, balance: 0, operations: 0 }
        : v,
    );
    const summary = parVehicule.reduce(
      (acc, v) => ({
        total_earned: acc.total_earned + v.total_earned,
        total_paid: acc.total_paid + v.total_paid,
        frais_depenses_total: acc.frais_depenses_total + v.frais_depenses,
        balance: acc.balance + v.balance,
        operations_count: acc.operations_count + v.operations,
      }),
      { total_earned: 0, total_paid: 0, frais_depenses_total: 0, balance: 0, operations_count: 0 },
    );

    return {
      filters: {
        period,
        date_debut: query.date_debut || "2026-08-01",
        date_fin: query.date_fin || "2026-08-26",
        vehicule_id: vehiculeId,
        statut: query.statut || null,
      },
      summary,
      par_vehicule: parVehicule.map((v) => ({
        vehicule_id: v.vehicule_id,
        nom_vehicule: v.nom_vehicule,
        immatriculation: v.immatriculation,
        frais_depenses: v.frais_depenses,
        total_earned: v.total_earned,
        total_paid: v.total_paid,
        balance: v.balance,
      })),
      vehicules: DASHBOARD_VEHICULES,
    };
  }),
);

const TEST_EXPENSES = [
  { id: "dep-1", date: "2026-08-22", montant: 68_400, type_code: "carburant", type_label: "Carburant", statut: "valide", statut_label: "Validé", commentaire: null, vehicule: { id: "veh-1", nom_vehicule: "ABARRY", immatriculation: "OU3859" } },
  { id: "dep-2", date: "2026-08-21", montant: 12_700, type_code: "peage", type_label: "Péage", statut: "valide", statut_label: "Validé", commentaire: null, vehicule: { id: "veh-1", nom_vehicule: "ABARRY", immatriculation: "OU3859" } },
  { id: "dep-3", date: "2026-08-20", montant: 284_000, type_code: "entretien", type_label: "Entretien", statut: "soumis", statut_label: "Soumis", commentaire: null, vehicule: { id: "veh-2", nom_vehicule: "ABARRY 2", immatriculation: "OU4217" } },
  { id: "dep-4", date: "2026-08-18", montant: 74_300, type_code: "carburant", type_label: "Carburant", statut: "valide", statut_label: "Validé", commentaire: null, vehicule: { id: "veh-2", nom_vehicule: "ABARRY 2", immatriculation: "OU4217" } },
  { id: "dep-5", date: "2026-08-15", montant: 15_000, type_code: "autre", type_label: "Autre", statut: "rejete", statut_label: "Rejeté", commentaire: "Justificatif illisible", vehicule: { id: "veh-1", nom_vehicule: "ABARRY", immatriculation: "OU3859" } },
];

// Pagination Laravel standard, factorisée : mêmes clés links/meta pour
// dépenses et activité (voir config/pagination.ts côté Nuxt).
function paginate(items, query, filters, path) {
  const perPage = Math.min(100, Math.max(1, Number(query.per_page) || 20));
  const page = Math.max(1, Number(query.page) || 1);
  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const data = items.slice(start, start + perPage);

  return {
    data,
    links: {
      first: `${path}?page=1`,
      last: `${path}?page=${lastPage}`,
      prev: page > 1 ? `${path}?page=${page - 1}` : null,
      next: page < lastPage ? `${path}?page=${page + 1}` : null,
    },
    meta: { current_page: page, last_page: lastPage, per_page: perPage, total },
    filters,
  };
}

router.get(
  "/api/v1/mobile/depenses/mine",
  defineEventHandler((event) => {
    requireTestToken(event);
    const query = getQuery(event);

    const filtered = TEST_EXPENSES.filter((expense) => {
      if (query.vehicule_id && expense.vehicule?.id !== query.vehicule_id) return false;
      if (query.statut && expense.statut !== query.statut) return false;
      if (query.date_debut && expense.date < query.date_debut) return false;
      if (query.date_fin && expense.date > query.date_fin) return false;
      return true;
    });

    return paginate(filtered, query, {
      vehicule_id: query.vehicule_id || null,
      depense_type_id: query.depense_type_id || null,
      statut: query.statut || null,
      date_debut: query.date_debut || null,
      date_fin: query.date_fin || null,
    }, "/api/v1/mobile/depenses/mine");
  }),
);

const TEST_ACTIVITY = [
  { id: "act-1", type: "vente", reference: "CMD-2847", statut: "livraison_en_cours", statut_label: "Livraison en cours", site_source: "Siège de Matoto", site_destination: "Client X", vehicule: { id: "veh-1", nom_vehicule: "ABARRY", immatriculation: "OU3859" }, date: "2026-08-20", nb_packs: 12 },
  { id: "act-2", type: "logistique", reference: "TR-00042-XYZ", statut: "cloture", statut_label: "Clôturé", site_source: "Siège de Matoto", site_destination: "Dépôt Kindia", vehicule: { id: "veh-1", nom_vehicule: "ABARRY", immatriculation: "OU3859" }, date: "2026-08-18", nb_packs: 40 },
  { id: "act-3", type: "vente", reference: "CMD-2839", statut: "livree", statut_label: "Livrée", site_source: "Siège de Matoto", site_destination: "Client Y", vehicule: { id: "veh-2", nom_vehicule: "ABARRY 2", immatriculation: "OU4217" }, date: "2026-08-17", nb_packs: 8 },
  { id: "act-4", type: "logistique", reference: "TR-00038-ABC", statut: "en_transit", statut_label: "En transit", site_source: "Dépôt Kindia", site_destination: "Siège de Matoto", vehicule: { id: "veh-2", nom_vehicule: "ABARRY 2", immatriculation: "OU4217" }, date: "2026-08-15", nb_packs: 25 },
];

router.get(
  "/api/v1/mobile/activite",
  defineEventHandler((event) => {
    requireTestToken(event);
    const query = getQuery(event);

    // Même règle que ActiviteMineRequest côté backend réel : `statut` exige
    // `type` (vocabulaires de statut distincts vente/logistique).
    if (query.statut && !query.type) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Le filtre "statut" nécessite de préciser "type" (vente ou logistique).',
        data: {
          message: 'Le filtre "statut" nécessite de préciser "type" (vente ou logistique).',
          errors: { statut: ['Le filtre "statut" nécessite de préciser "type" (vente ou logistique) : les deux modèles ont des statuts différents.'] },
        },
      });
    }

    const filtered = TEST_ACTIVITY.filter((item) => {
      if (query.type && item.type !== query.type) return false;
      if (query.statut && item.statut !== query.statut) return false;
      if (query.vehicule_id && item.vehicule?.id !== query.vehicule_id) return false;
      if (query.date_debut && item.date < query.date_debut) return false;
      if (query.date_fin && item.date > query.date_fin) return false;
      return true;
    }).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    return paginate(filtered, query, {
      type: query.type || null,
      statut: query.statut || null,
      vehicule_id: query.vehicule_id || null,
      date_debut: query.date_debut || null,
      date_fin: query.date_fin || null,
    }, "/api/v1/mobile/activite");
  }),
);

// État mutable en mémoire (comme profileState plus haut) : permet un vrai
// cycle GET -> POST mark-all-read -> GET dans un test E2E. Nouveau contrat
// (chantier backend "contrat API notifications" finalisé le 27/08/2026, migré
// côté Nuxt le 28/08/2026) : pagination Laravel standard (mêmes clés
// links/meta que paginate() ci-dessus, mais SANS `filters` — absent du
// contrat réel de cet endpoint) + `unread_count` global, `resource` distinct
// de `type` (type de RESSOURCE, jamais le type d'événement).
// `resource.id` de notif-2 correspond volontairement à l'`id` réel (`act-1`)
// d'un item TEST_ACTIVITY (type "vente", reference "CMD-2847") — même
// correspondance que le vrai contrat backend (App\Notifications\
// CommandeValideeNotification::commande_id === CommandeVente::id, exposé
// aujourd'hui comme resource.id, voir config/clientNotifications.ts::
// notificationResourceToRoute), pour pouvoir tester la redirection
// contextuelle "notification -> Livraisons -> détail ouvert" de bout en bout.
const TEST_NOTIFICATIONS = [
  { id: "notif-1", type: "delivery.assigned", titre: "Livraison CMD-2841 terminée", message: "12 packs livrés aujourd'hui", montant: null, resource: null, lu: false, read_at: null, created_at: "2026-08-26T10:00:00.000000Z" },
  { id: "notif-2", type: "delivery.assigned", titre: "Nouvelle commande attribuée", message: "Commande CMD-2847", montant: null, resource: { type: "commande_vente", id: "act-1" }, lu: false, read_at: null, created_at: "2026-08-25T15:30:00.000000Z" },
  { id: "notif-3", type: "transfer.received", titre: "Versement reçu", message: "Un versement a été reçu sur votre compte.", montant: 850_000, resource: null, lu: true, read_at: "2026-08-24T09:15:00.000000Z", created_at: "2026-08-24T09:12:00.000000Z" },
];

router.get(
  "/api/v1/mobile/notifications",
  defineEventHandler((event) => {
    requireTestToken(event);
    const page = paginate(TEST_NOTIFICATIONS, getQuery(event), {}, "/api/v1/mobile/notifications");
    return { data: page.data, links: page.links, meta: page.meta, unread_count: TEST_NOTIFICATIONS.filter((n) => !n.lu).length };
  }),
);

router.post(
  "/api/v1/mobile/notifications/mark-all-read",
  defineEventHandler((event) => {
    requireTestToken(event);
    const now = new Date().toISOString();
    for (const n of TEST_NOTIFICATIONS) {
      if (!n.lu) {
        n.lu = true;
        n.read_at = now;
      }
    }
    return { success: true, unread_count: 0 };
  }),
);

router.post(
  "/api/v1/mobile/notifications/:id/read",
  defineEventHandler((event) => {
    requireTestToken(event);
    const id = getRouterParam(event, "id");
    const notification = TEST_NOTIFICATIONS.find((n) => n.id === id);
    // 404 (jamais 403) si l'id n'appartient pas à ce compte — même convention
    // que le vrai contrat, voir server/api/client/notifications/[id]/read.post.ts.
    if (!notification) {
      throw createError({ statusCode: 404, statusMessage: "Notification introuvable." });
    }
    if (!notification.lu) {
      notification.lu = true;
      notification.read_at = new Date().toISOString();
    }
    return { success: true, data: notification, unread_count: TEST_NOTIFICATIONS.filter((n) => !n.lu).length };
  }),
);

app.use(router);

const port = Number(process.env.MOCK_BACKEND_PORT || 8100);
createServer(toNodeListener(app)).listen(port, () => {
  console.log(`[mock-backend] listening on http://localhost:${port}`);
});
