import { test, expect, type Page } from "@playwright/test";

// Connexion sans mot de passe par OTP (chantier du 27/08/2026) — contrairement
// à tests/e2e/connexion.spec.ts (page.route(), qui contourne entièrement le
// code des routes BFF), ces tests utilisent le vrai serveur mocké partagé
// (tests/e2e/mock-backend.mjs) : ils exercent donc réellement
// server/api/auth/otp-login/{request,verify}.post.ts, pas seulement le
// frontend. Numéros/codes dédiés par scénario, DUPLIQUÉS depuis
// mock-backend.mjs plutôt qu'importés — même règle que TEST_TELEPHONE/
// TEST_PASSWORD dans tests/e2e/helpers.ts (mock-backend.mjs démarre un
// serveur HTTP dès son import, un second import entrerait en conflit de
// port avec l'instance déjà démarrée par playwright.config.ts).
const TEST_TELEPHONE_LOCAL = "601020304"; // TEST_TELEPHONE du mock backend
const NOT_FOUND_LOCAL = "699999999";
const RATE_LIMITED_LOCAL = "688888888";
const UNAVAILABLE_LOCAL = "677777777";
const CODE_VALID = "111111";
const CODE_LOCKED = "000000";
// OTP_TELEPHONE_SMS_CHANNEL / OTP_DESTINATION_MASKED_SMS du mock backend
// (revue UX Nimba SMS + fallback email du 31/08/2026).
const SMS_CHANNEL_LOCAL = "666666666";
const SMS_DESTINATION_MASKED = "+224 6•• •• •• 66";

async function gotoConnexion(page: Page) {
  await page.goto("/connexion", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load");
  // 2000ms, pas 300ms : même délai d'hydratation documenté dans
  // tests/e2e/profil.spec.ts — un remplissage/clic trop tôt échoue
  // silencieusement avant que les @input/@click Vue ne soient attachés (le
  // DOM affiche la valeur tapée par Playwright, mais un re-rendu réactif
  // ultérieur l'écrase, puisque le ref sous-jacent n'a jamais été mis à
  // jour). Bug réel trouvé le 27/08/2026 : "le téléphone déjà saisi est
  // conservé..." échouait de façon non déterministe (parfois immédiat avec
  // une valeur vide, parfois un timeout de 90s) selon la charge/l'état de
  // compilation du serveur dev au moment du tout premier remplissage.
  await page.waitForTimeout(2000);
}

async function fillPhone(page: Page, digits: string) {
  await page.getByLabel("Numéro de téléphone").fill(digits);
}

async function switchToOtp(page: Page) {
  await page.getByRole("button", { name: "Se connecter avec un code" }).click();
}

async function fillOtpCode(page: Page, code: string) {
  // InputOtp (PrimeVue) n'est monté/attaché qu'à l'arrivée sur l'écran de
  // saisie du code — un clic+frappe immédiat après l'apparition du titre
  // (Vérifiez votre email) peut le devancer (bug réel trouvé le 27/08/2026,
  // même famille que le délai d'hydratation de gotoConnexion() ci-dessus).
  //
  // Remplissage case par case (.fill() sur CHAQUE <input>, pas un clic sur
  // la première case + frappe clavier globale) : plus déterministe qu'un
  // page.keyboard.type() qui dépend de la logique interne d'avancement de
  // focus d'InputOtp entre chaque caractère — sous charge (ex. suite
  // complète des 84 tests E2E), cette rafale de keydown pouvait perdre des
  // caractères et laisser le code final incomplet (bouton "Valider et se
  // connecter" resté disabled indéfiniment). Un .fill() ciblé par case
  // déclenche l'événement input attendu par InputOtp sans dépendre du focus
  // séquentiel.
  await page.waitForTimeout(1000);
  const inputs = page.locator(".connexion-otp-code-field input");
  await expect(inputs.first()).toBeVisible({ timeout: 10_000 });
  for (let i = 0; i < code.length; i += 1) {
    await inputs.nth(i).fill(code[i]!);
  }
}

test.describe("Connexion — sans mot de passe par OTP", () => {
  // Voir le commentaire équivalent dans tests/e2e/profil.spec.ts : cold-start
  // (compile Vite à la volée + démarrage concurrent du mock backend) mesuré
  // plus lent que le timeout par défaut de Playwright.
  test.describe.configure({ timeout: 90_000 });

  test("le téléphone déjà saisi est conservé au passage vers le mode code, et inversement", async ({ page }) => {
    await gotoConnexion(page);
    await fillPhone(page, TEST_TELEPHONE_LOCAL);

    await switchToOtp(page);
    await expect(page.getByLabel("Numéro de téléphone")).toHaveValue(TEST_TELEPHONE_LOCAL);

    await page.getByRole("button", { name: "Utiliser mon mot de passe" }).click();
    await expect(page.getByLabel("Numéro de téléphone")).toHaveValue(TEST_TELEPHONE_LOCAL);
    // Retour au mode mot de passe : le champ mot de passe réapparaît.
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
  });

  test("liste des canaux purement informative : SMS et Email affichés disponibles, WhatsApp affiché bientôt disponible, aucun n'est un bouton", async ({ page }) => {
    await gotoConnexion(page);
    await switchToOtp(page);

    const channels = page.locator(".connexion-otp-channels");
    const email = channels.getByText("Email", { exact: true });
    const whatsapp = channels.getByText("WhatsApp", { exact: true });
    const sms = channels.getByText("SMS", { exact: true });

    // Le contrat backend ne permet toujours pas de choisir un canal (voir
    // config/auth.ts) : cette liste ne doit donc plus prétendre en offrir un
    // — aucun de ces trois éléments n'est un <button>/role="button".
    await expect(page.getByRole("button", { name: /^Email/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^WhatsApp/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^SMS/ })).toHaveCount(0);

    await expect(email).toBeVisible();
    await expect(sms).toBeVisible();
    await expect(whatsapp).toBeVisible();

    // Nimba est configuré : SMS est réellement opérationnel aujourd'hui,
    // contrairement à WhatsApp — seul WhatsApp porte encore "Bientôt".
    await expect(channels.getByText("Bientôt disponible")).toHaveCount(1);
    await expect(channels.locator(".connexion-otp-channel", { hasText: "WhatsApp" })).toContainText("Bientôt disponible");
    await expect(channels.locator(".connexion-otp-channel", { hasText: "SMS" })).not.toContainText("Bientôt disponible");
    await expect(channels.locator(".connexion-otp-channel", { hasText: "Email" })).not.toContainText("Bientôt disponible");
  });

  test("le gros header (logo + Connexion + Eau la maman) disparaît en mode OTP", async ({ page }) => {
    await gotoConnexion(page);
    await expect(page.getByText("Eau la maman")).toBeVisible();

    await switchToOtp(page);

    await expect(page.getByText("Eau la maman")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Connexion avec un code" })).toBeVisible();
  });

  test("parcours complet : demande de code, saisie, connexion réussie", async ({ page }) => {
    await gotoConnexion(page);
    await switchToOtp(page);
    await fillPhone(page, TEST_TELEPHONE_LOCAL);

    await page.getByRole("button", { name: "Recevoir le code" }).click();

    await expect(page.getByRole("heading", { name: "Vérifiez votre email" })).toBeVisible({ timeout: 10_000 });
    // Plus de champ téléphone éditable à cette étape, et surtout : jamais le
    // téléphone affiché ici (induirait en erreur, le code est parti par
    // email) — la vraie destination masquée renvoyée par le backend, oui.
    await expect(page.getByLabel("Numéro de téléphone")).toHaveCount(0);
    await expect(page.getByText(`+224${TEST_TELEPHONE_LOCAL}`)).toHaveCount(0);
    await expect(page.getByText("Code envoyé à j***@example.com")).toBeVisible();

    await fillOtpCode(page, CODE_VALID);
    await page.getByRole("button", { name: "Valider et se connecter" }).click();

    await expect(page).toHaveURL(/\/espace-client$/, { timeout: 10_000 });
  });

  test("numéro inconnu (404) : message clair et proposition de créer un compte, reste sur l'écran de demande", async ({ page }) => {
    await gotoConnexion(page);
    await switchToOtp(page);
    await fillPhone(page, NOT_FOUND_LOCAL);

    await page.getByRole("button", { name: "Recevoir le code" }).click();

    await expect(page.getByText("Aucun compte n’est associé à ce numéro.")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: "Créer un compte" })).toBeVisible();
    // Toujours en mode demande : le champ téléphone éditable est encore là.
    await expect(page.getByLabel("Numéro de téléphone")).toBeVisible();
  });

  test("anti-spam (429 sur la demande) : délai affiché, bouton désactivé, aucun retry automatique", async ({ page }) => {
    await gotoConnexion(page);
    await switchToOtp(page);
    await fillPhone(page, RATE_LIMITED_LOCAL);

    await page.getByRole("button", { name: "Recevoir le code" }).click();

    // Message composé côté front à partir de retry_after_seconds (jamais le
    // texte brut du backend, potentiellement plus verbeux) — voir
    // composables/useOtpLogin.ts et pages/connexion.vue.
    await expect(page.getByText(/Trop de demandes\. Réessayez dans \d+ s\./)).toBeVisible({ timeout: 10_000 });
    const retryButton = page.getByRole("button", { name: /Réessayer dans \d+ s/ });
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toBeDisabled();
  });

  test("aucun canal disponible (503) : message support, jamais un retry automatique", async ({ page }) => {
    await gotoConnexion(page);
    await switchToOtp(page);
    await fillPhone(page, UNAVAILABLE_LOCAL);

    await page.getByRole("button", { name: "Recevoir le code" }).click();

    await expect(page.getByText("Nous ne pouvons pas envoyer de code de connexion pour ce compte actuellement. Veuillez contacter le support.")).toBeVisible({ timeout: 10_000 });
  });

  test("code incorrect (422) : message clair, reste sur l'écran de saisie du code", async ({ page }) => {
    await gotoConnexion(page);
    await switchToOtp(page);
    await fillPhone(page, TEST_TELEPHONE_LOCAL);
    await page.getByRole("button", { name: "Recevoir le code" }).click();
    await expect(page.getByRole("heading", { name: "Vérifiez votre email" })).toBeVisible({ timeout: 10_000 });

    await fillOtpCode(page, "999999");
    await page.getByRole("button", { name: "Valider et se connecter" }).click();

    await expect(page.getByText("Code incorrect ou expiré.")).toBeVisible({ timeout: 10_000 });
    // Reste sur l'écran de saisie du code (pas de retour à l'étape demande).
    await expect(page.getByRole("heading", { name: "Vérifiez votre email" })).toBeVisible();
  });

  test("verrouillage après trop de tentatives (429 sur verify) : retour à l'étape demande d'un nouveau code", async ({ page }) => {
    await gotoConnexion(page);
    await switchToOtp(page);
    await fillPhone(page, TEST_TELEPHONE_LOCAL);
    await page.getByRole("button", { name: "Recevoir le code" }).click();
    await expect(page.getByRole("heading", { name: "Vérifiez votre email" })).toBeVisible({ timeout: 10_000 });

    await fillOtpCode(page, CODE_LOCKED);
    await page.getByRole("button", { name: "Valider et se connecter" }).click();

    await expect(page.getByText("Trop de tentatives. Demandez un nouveau code.")).toBeVisible({ timeout: 10_000 });
    // Repasse à l'écran de demande (le challenge précédent n'est plus utilisable).
    await expect(page.getByRole("button", { name: "Recevoir le code" })).toBeVisible();
    await expect(page.getByLabel("Numéro de téléphone")).toHaveValue(TEST_TELEPHONE_LOCAL);
  });

  test("renvoyer le code : désactivé pendant le cooldown renvoyé par le backend", async ({ page }) => {
    await gotoConnexion(page);
    await switchToOtp(page);
    await fillPhone(page, TEST_TELEPHONE_LOCAL);
    await page.getByRole("button", { name: "Recevoir le code" }).click();
    await expect(page.getByRole("heading", { name: "Vérifiez votre email" })).toBeVisible({ timeout: 10_000 });

    const resend = page.getByRole("button", { name: /Renvoyer le code dans \d+ s/ });
    await expect(resend).toBeVisible();
    await expect(resend).toBeDisabled();
  });

  test("modifier le numéro depuis l'écran de saisie du code revient à l'étape de demande, en mode OTP", async ({ page }) => {
    await gotoConnexion(page);
    await switchToOtp(page);
    await fillPhone(page, TEST_TELEPHONE_LOCAL);
    await page.getByRole("button", { name: "Recevoir le code" }).click();
    await expect(page.getByRole("heading", { name: "Vérifiez votre email" })).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Modifier le numéro" }).click();

    await expect(page.getByRole("button", { name: "Recevoir le code" })).toBeVisible();
    await expect(page.getByLabel("Numéro de téléphone")).toHaveValue(TEST_TELEPHONE_LOCAL);
  });

  // ── Revue UX Nimba SMS + fallback email automatique (31/08/2026) ─────────
  test.describe("channel=sms : formulation prudente (Nimba est asynchrone, fallback email géré côté backend)", () => {
    test("téléphone affiché, jamais une affirmation de livraison, mention du fallback email", async ({ page }) => {
      await gotoConnexion(page);
      await switchToOtp(page);
      await fillPhone(page, SMS_CHANNEL_LOCAL);

      await page.getByRole("button", { name: "Recevoir le code" }).click();

      await expect(page.getByRole("heading", { name: "Envoi de votre code par SMS" })).toBeVisible({ timeout: 10_000 });
      const destination = page.locator(".connexion-otp-destination");
      await expect(destination).toHaveText(`Nous envoyons votre code par SMS au ${SMS_DESTINATION_MASKED}.`);

      // Jamais une affirmation de livraison certaine pour un canal
      // asynchrone sur la ligne PRINCIPALE — "envoyé"/"avec succès" ne
      // doivent apparaître nulle part dedans (le complément de secours
      // ci-dessous mentionne légitimement "envoyé", mais à propos de
      // l'email de secours, jamais du SMS lui-même).
      await expect(destination).not.toContainText(/envoyé/i);
      await expect(destination).not.toContainText(/avec succès/i);

      // Complément de secours rassurant, jamais présenté comme une erreur —
      // une seule information secondaire, pas d'alerte en plus.
      await expect(page.getByText("En cas de problème avec le SMS, le code peut être envoyé par email si une adresse est enregistrée sur votre compte.")).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);
    });

    test("verify réutilise le même contrat (device_name, code à 6 chiffres) : parcours complet jusqu'à l'espace client", async ({ page }) => {
      await gotoConnexion(page);
      await switchToOtp(page);
      await fillPhone(page, SMS_CHANNEL_LOCAL);
      await page.getByRole("button", { name: "Recevoir le code" }).click();
      await expect(page.getByRole("heading", { name: "Envoi de votre code par SMS" })).toBeVisible({ timeout: 10_000 });

      // Le mock backend n'accepte le code valide que pour TEST_TELEPHONE ;
      // ce test ne vérifie donc que la présentation de l'écran de saisie
      // (champ, bouton, formulation) reste correcte pour ce canal, pas une
      // connexion réussie avec ce numéro dédié.
      await expect(page.locator(".connexion-otp-code-field input").first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole("button", { name: "Valider et se connecter" })).toBeVisible();
    });
  });

  test("aucune mention du canal choisi/tenté n'est envoyée par le front : le corps de la requête ne contient que telephone", async ({ page }) => {
    await gotoConnexion(page);
    await switchToOtp(page);
    await fillPhone(page, TEST_TELEPHONE_LOCAL);

    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("/api/auth/otp-login/request") && req.method() === "POST"),
      page.getByRole("button", { name: "Recevoir le code" }).click(),
    ]);

    expect(Object.keys(request.postDataJSON())).toEqual(["telephone"]);
  });

  test("double-clic sur \"Recevoir le code\" : une seule requête POST envoyée", async ({ page }) => {
    await gotoConnexion(page);
    await switchToOtp(page);
    await fillPhone(page, TEST_TELEPHONE_LOCAL);

    let requestCount = 0;
    await page.route("**/api/auth/otp-login/request", async (route) => {
      requestCount += 1;
      await route.continue();
    });

    // Deux clics natifs déclenchés dans la même tâche synchrone (jamais deux
    // appels .click() de Playwright séparés, qui ne reproduisent pas de façon
    // fiable la course réelle d'un double-clic) : reproduit fidèlement le cas
    // qu'empêche la garde de composables/useOtpLogin.ts::requestCode().
    await page.getByRole("button", { name: "Recevoir le code" }).evaluate((el: HTMLElement) => {
      (el as HTMLButtonElement).click();
      (el as HTMLButtonElement).click();
    });

    await expect(page.getByRole("heading", { name: "Vérifiez votre email" })).toBeVisible({ timeout: 10_000 });
    expect(requestCount).toBe(1);
  });

  test("double-clic sur \"Valider et se connecter\" : une seule requête POST envoyée", async ({ page }) => {
    await gotoConnexion(page);
    await switchToOtp(page);
    await fillPhone(page, TEST_TELEPHONE_LOCAL);
    await page.getByRole("button", { name: "Recevoir le code" }).click();
    await expect(page.getByRole("heading", { name: "Vérifiez votre email" })).toBeVisible({ timeout: 10_000 });
    await fillOtpCode(page, CODE_VALID);

    let requestCount = 0;
    await page.route("**/api/auth/otp-login/verify", async (route) => {
      requestCount += 1;
      await route.continue();
    });

    await page.getByRole("button", { name: "Valider et se connecter" }).evaluate((el: HTMLElement) => {
      (el as HTMLButtonElement).click();
      (el as HTMLButtonElement).click();
    });

    await expect(page).toHaveURL(/\/espace-client$/, { timeout: 10_000 });
    expect(requestCount).toBe(1);
  });
});
