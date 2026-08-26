<script setup lang="ts">
definePageMeta({ layout: false, middleware: "guest" });

useHead({
  title: "Connexion — Eau La Maman",
  meta: [
    { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" },
  ],
});

// Contrat réel du backend (elm-monolithe, docs/api-auth-contract.md) :
//   POST /api/auth/login (relayé par server/api/auth/login.post.ts)
//   body: { telephone: "+224XXXXXXXXX", password: string }
//   200 -> { user: { id, prenom, nom, telephone, email, roles } } (token
//          jamais renvoyé au navigateur, voir composables/useAuth.ts)
//   422 -> { errors: { telephone: [...] } } (identifiants incorrects)
//   403 -> { code: "email_not_verified" | "account_blocked" | "pending_validation" }
//
// Appelé pour de vrai dans TOUS les environnements, y compris `nuxt dev` —
// décision du 26/08/2026 : aucun bypass d'auth runtime, même en
// développement local (voir docs/environment.md). pages/inscription.vue et
// pages/mot-de-passe-oublie.vue suivent désormais la même règle. Un backend
// injoignable produit une vraie erreur affichée à l'écran (voir
// server/utils/monolithClient.ts), jamais un faux succès silencieux. Les
// tests E2E qui ont besoin d'un vrai aller-retour (tests/e2e/connexion.spec.ts)
// utilisent soit page.route() pour les scénarios de validation/erreur
// purement client, soit le mock backend dédié (tests/e2e/mock-backend.mjs)
// pour un login qui doit réellement établir une session.

type Country = { name: string; iso2: string; dial: string; digits: number };

const countries: Country[] = [
  { name: "Guinée", iso2: "GN", dial: "+224", digits: 9 },
  { name: "Sénégal", iso2: "SN", dial: "+221", digits: 9 },
  { name: "Mali", iso2: "ML", dial: "+223", digits: 8 },
  { name: "Côte d’Ivoire", iso2: "CI", dial: "+225", digits: 10 },
  { name: "Guinée-Bissau", iso2: "GW", dial: "+245", digits: 7 },
  { name: "Sierra Leone", iso2: "SL", dial: "+232", digits: 8 },
  { name: "Liberia", iso2: "LR", dial: "+231", digits: 8 },
  { name: "Gambie", iso2: "GM", dial: "+220", digits: 7 },
  { name: "Mauritanie", iso2: "MR", dial: "+222", digits: 8 },
  { name: "Burkina Faso", iso2: "BF", dial: "+226", digits: 8 },
  { name: "Niger", iso2: "NE", dial: "+227", digits: 8 },
  { name: "Ghana", iso2: "GH", dial: "+233", digits: 9 },
  { name: "Nigeria", iso2: "NG", dial: "+234", digits: 10 },
  { name: "Togo", iso2: "TG", dial: "+228", digits: 8 },
  { name: "Bénin", iso2: "BJ", dial: "+229", digits: 8 },
  { name: "Cameroun", iso2: "CM", dial: "+237", digits: 9 },
  { name: "Gabon", iso2: "GA", dial: "+241", digits: 8 },
  { name: "Congo-Brazzaville", iso2: "CG", dial: "+242", digits: 9 },
  { name: "RD Congo", iso2: "CD", dial: "+243", digits: 9 },
  { name: "Tchad", iso2: "TD", dial: "+235", digits: 8 },
  { name: "Maroc", iso2: "MA", dial: "+212", digits: 9 },
  { name: "Algérie", iso2: "DZ", dial: "+213", digits: 9 },
  { name: "Tunisie", iso2: "TN", dial: "+216", digits: 8 },
  { name: "Égypte", iso2: "EG", dial: "+20", digits: 10 },
  { name: "Afrique du Sud", iso2: "ZA", dial: "+27", digits: 9 },
  { name: "Kenya", iso2: "KE", dial: "+254", digits: 9 },
  { name: "Éthiopie", iso2: "ET", dial: "+251", digits: 9 },
  { name: "France", iso2: "FR", dial: "+33", digits: 9 },
  { name: "Belgique", iso2: "BE", dial: "+32", digits: 9 },
  { name: "Espagne", iso2: "ES", dial: "+34", digits: 9 },
  { name: "Portugal", iso2: "PT", dial: "+351", digits: 9 },
  { name: "Allemagne", iso2: "DE", dial: "+49", digits: 10 },
  { name: "Royaume-Uni", iso2: "GB", dial: "+44", digits: 10 },
  { name: "États-Unis / Canada", iso2: "US", dial: "+1", digits: 10 },
  { name: "Italie", iso2: "IT", dial: "+39", digits: 10 },
  { name: "Suisse", iso2: "CH", dial: "+41", digits: 9 },
  { name: "Chine", iso2: "CN", dial: "+86", digits: 11 },
  { name: "Inde", iso2: "IN", dial: "+91", digits: 10 },
  { name: "Brésil", iso2: "BR", dial: "+55", digits: 11 },
  { name: "Liban", iso2: "LB", dial: "+961", digits: 8 },
  { name: "Émirats arabes unis", iso2: "AE", dial: "+971", digits: 9 },
  { name: "Arabie saoudite", iso2: "SA", dial: "+966", digits: 9 },
  { name: "Turquie", iso2: "TR", dial: "+90", digits: 10 },
];

// Drapeaux en image (flagcdn.com), pas en emoji : les emoji drapeaux ne
// s'affichent pas correctement sous Windows/Chrome (rendu en texte "GN").
// Même approche que le sélecteur déjà utilisé sur le login de elm-monolithe.
const flagUrl = (iso2: string) => `https://flagcdn.com/24x18/${iso2.toLowerCase()}.png`;

const STORAGE_KEY = "login_country_code";

const selectedCode = ref<string>(countries[0].iso2);
const selectedCountry = computed(() => countries.find((c) => c.iso2 === selectedCode.value) ?? countries[0]);

const phoneDigits = ref("");
const password = ref("");
const showPassword = ref(false);
const isSubmitting = ref(false);

onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && countries.some((c) => c.iso2 === saved)) selectedCode.value = saved;
  } catch {
    // localStorage indisponible (navigation privée, etc.) : on garde la Guinée par défaut.
  }
});

watch(selectedCode, (code) => {
  phoneDigits.value = "";
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // idem, sans conséquence si l'écriture échoue.
  }
});

const onPhoneInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const digitsOnly = target.value.replace(/\D/g, "").slice(0, selectedCountry.value.digits);
  phoneDigits.value = digitsOnly;
  target.value = digitsOnly;
};

// Reproduit exactement App\Services\PhoneNormalizer::normalize() côté back :
// le numéro final doit commencer par "+" et compter entre 7 et 15 chiffres
// (E.164). Le "+indicatif" est déjà garanti par selectedCountry.dial, donc
// on ne revérifie que le compte de chiffres du résultat assemblé.
const normalizePhone = (fullNumber: string) => {
  const digitsOnly = fullNumber.replace(/\D/g, "");
  return { digitsOnly, isValid: digitsOnly.length >= 7 && digitsOnly.length <= 15 };
};

const hasAttemptedSubmit = ref(false);

// Erreur téléphone : uniquement ce que le back exige réellement — champ vide,
// ou numéro rejeté par PhoneNormalizer une fois assemblé (7-15 chiffres après
// le "+"). Le nombre de chiffres attendu par pays (selectedCountry.digits)
// reste une simple aide de saisie (placeholder/maxlength) : ne jamais
// bloquer la soumission avec un numéro plus court que ce nombre indicatif,
// le back ne l'exige pas.
const phoneError = computed(() => {
  if (!phoneDigits.value) return "Numéro de téléphone requis.";
  if (!normalizePhone(`${selectedCountry.value.dial}${phoneDigits.value}`).isValid) {
    return "Numéro de téléphone invalide.";
  }
  return "";
});

// Le login (POST /api/auth/login) ne vérifie que required|string sur le mot
// de passe — aucune règle de complexité. Ces règles n'existent que côté
// inscription (voir pages/inscription.vue). Un mot de passe existant peut
// venir d'un ancien compte, d'un import, ou d'un changement de politique :
// le front ne doit jamais empêcher une tentative que le back accepterait
// d'examiner. Ne PAS réintroduire de règle de complexité ici.
const passwordError = computed(() => (password.value ? "" : "Mot de passe requis."));

// Identifiants prêts à envoyer, validés selon les mêmes règles que le back
// (normalizePhone / phoneError ci-dessus). `device_name` n'est plus construit
// ici : il est centralisé côté serveur (config/auth.ts::DEVICE_NAME, utilisé
// par server/api/auth/login.post.ts) pour ne jamais le dupliquer/diverger
// entre composants.
const buildCredentials = () => ({
  telephone: `${selectedCountry.value.dial}${phoneDigits.value}`,
  password: password.value,
});

const phoneInputRef = ref<HTMLInputElement | null>(null);
const passwordInputRef = ref<HTMLInputElement | null>(null);

const router = useRouter();
const auth = useAuth();
const globalError = ref("");

const handleSubmit = async () => {
  if (isSubmitting.value) return;

  hasAttemptedSubmit.value = true;
  globalError.value = "";

  if (phoneError.value) {
    await nextTick();
    phoneInputRef.value?.focus();
    return;
  }

  if (passwordError.value) {
    await nextTick();
    passwordInputRef.value?.focus();
    return;
  }

  isSubmitting.value = true;

  const credentials = buildCredentials();
  const result = await auth.login(credentials);
  isSubmitting.value = false;

  if (!result.ok) {
    globalError.value = result.error.message;
    return;
  }

  router.push("/espace-client");
};

// Si ce chargement de /connexion fait suite à une redirection forcée (session
// expirée/compte désactivé pendant la navigation — voir middleware/auth.ts et
// server/api/auth/me.get.ts), auth.lastError porte le message à afficher.
// Consommé une seule fois : on ne veut pas le réafficher à une nouvelle
// tentative de connexion échouée pour une raison différente.
onMounted(() => {
  if (auth.lastError.value) {
    globalError.value = auth.lastError.value.message;
    auth.lastError.value = null;
  }
  document.body.style.overflow = "hidden";
});

onBeforeUnmount(() => {
  document.body.style.overflow = "";
});
</script>

<template>
  <div class="connexion-screen">
    <div class="connexion-card">
      <div class="connexion-brand">
        <NuxtLink to="/" class="connexion-brand-mark" aria-label="Retour à l’accueil"><BrandMark /></NuxtLink>
        <h1>Connexion</h1>
        <p>Eau la maman</p>
      </div>

      <p v-if="globalError" class="connexion-global-error" role="alert" aria-live="assertive">{{ globalError }}</p>

      <form class="connexion-form" novalidate @submit.prevent="handleSubmit">
        <label class="connexion-field">
          <span>Numéro de téléphone</span>
          <div class="connexion-phone" :class="{ 'has-error': hasAttemptedSubmit && phoneError }">
            <Select
              v-model="selectedCode"
              :options="countries"
              option-label="name"
              option-value="iso2"
              filter
              filter-placeholder="Rechercher un pays"
              class="connexion-country-select"
              aria-label="Choisir l’indicatif du pays"
            >
              <template #value>
                <span class="connexion-country-value">
                  <img :src="flagUrl(selectedCountry.iso2)" width="20" height="15" alt="">
                  <span>{{ selectedCountry.dial }}</span>
                </span>
              </template>
              <template #option="{ option }">
                <span class="connexion-country-option-row">
                  <img :src="flagUrl(option.iso2)" width="20" height="15" alt="">
                  <span class="connexion-country-option-name">{{ option.name }}</span>
                  <span class="connexion-country-option-dial">{{ option.dial }}</span>
                </span>
              </template>
            </Select>

            <input
              ref="phoneInputRef"
              :value="phoneDigits"
              type="tel"
              inputmode="numeric"
              autocomplete="tel-national"
              :placeholder="`${selectedCountry.digits} chiffres`"
              :maxlength="selectedCountry.digits"
              aria-label="Numéro de téléphone"
              :aria-invalid="hasAttemptedSubmit && !!phoneError"
              :aria-describedby="hasAttemptedSubmit && phoneError ? 'connexion-phone-error' : undefined"
              @input="onPhoneInput"
            >
          </div>
          <div class="connexion-field-error-slot">
            <p v-if="hasAttemptedSubmit && phoneError" id="connexion-phone-error" class="connexion-error" aria-live="polite">{{ phoneError }}</p>
          </div>
        </label>

        <label class="connexion-field">
          <span>Mot de passe</span>
          <div class="connexion-password" :class="{ 'has-error': hasAttemptedSubmit && passwordError }">
            <input
              ref="passwordInputRef"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="••••••••"
              :aria-invalid="hasAttemptedSubmit && !!passwordError"
              :aria-describedby="hasAttemptedSubmit && passwordError ? 'connexion-password-error' : undefined"
            >
            <button
              type="button"
              class="connexion-password-toggle"
              :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              @click="showPassword = !showPassword"
            >
              <i :class="['pi', showPassword ? 'pi-eye-slash' : 'pi-eye']" aria-hidden="true" />
            </button>
          </div>
          <div class="connexion-field-error-slot">
            <p v-if="hasAttemptedSubmit && passwordError" id="connexion-password-error" class="connexion-error" aria-live="polite">{{ passwordError }}</p>
          </div>
        </label>

        <button type="submit" class="connexion-submit" :disabled="isSubmitting">
          {{ isSubmitting ? "Connexion…" : "Se connecter" }}
        </button>
      </form>

      <NuxtLink to="/mot-de-passe-oublie" class="connexion-forgot">
        Mot de passe oublié ?
      </NuxtLink>

      <p class="connexion-signup">Pas encore de compte ? <NuxtLink to="/inscription">Créer un compte</NuxtLink></p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.connexion-screen {
  position: fixed;
  inset: 0;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100dvh;
  padding: 1.5rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--p-surface-100, #eef1f6);
  -webkit-text-size-adjust: 100%;
}

.connexion-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 24rem;
  margin: auto;
}

.connexion-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2.5rem;
}

.connexion-global-error {
  margin: -1.5rem 0 1.5rem;
  padding: 0.75rem 1rem;
  color: var(--p-red-600, #dc2626);
  text-align: center;
  background: color-mix(in srgb, var(--p-red-500, #ef4444) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--p-red-500, #ef4444) 30%, transparent);
  border-radius: 0.75rem;
  font-size: 0.85rem;
  font-weight: 700;
}

.connexion-brand-mark {
  display: block;
  width: 5rem;
  height: 5rem;
  cursor: pointer;
  text-decoration: none;
  transition: transform 0.15s ease;
}

.connexion-brand-mark:active {
  transform: scale(0.95);
}

.connexion-brand-mark :deep(svg) {
  width: 100%;
  height: 100%;
}

.connexion-brand h1 {
  margin: 0.4rem 0 0;
  color: var(--p-text-color);
  font-size: 1.6rem;
  font-weight: 800;
}

.connexion-brand p {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.95rem;
}

.connexion-form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.connexion-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  color: var(--p-text-color);
  font-size: 0.85rem;
  font-weight: 700;
}

.connexion-phone,
.connexion-password {
  display: flex;
  align-items: stretch;
  // Hauteur fixe (pas seulement min-height) : indispensable pour que le
  // `height: 100%` du champ de saisie et du sélecteur pays se résolve
  // correctement et que les deux segments soient alignés pixel pour pixel.
  height: 3.25rem;
  overflow: hidden;
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
  border-radius: 1rem;
  transition: border-color 0.15s ease;
}

.connexion-phone.has-error,
.connexion-password.has-error {
  border-color: var(--p-red-500, #ef4444);
}

// Select PrimeVue : même widget que le sélecteur déjà utilisé côté
// elm-monolithe (fiable, testé), plutôt qu'un popover fait main. Son overlay
// est téléporté hors de cette page : tokens natifs --p-* uniquement.
.connexion-country-select {
  flex: 0 0 auto;
  height: 100%;
}

.connexion-country-select.p-select {
  display: flex;
  align-items: stretch;
  height: 100%;
  background: transparent;
  border: 0;
  border-right: 1px solid var(--p-content-border-color);
  border-radius: 0;
}

.connexion-country-select :deep(.p-select-label) {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 0.4rem 0 0.85rem;
  color: var(--p-text-color);
  // Même taille/hauteur de ligne que le champ voisin (.connexion-phone
  // input) pour que le texte des deux segments soit sur la même ligne de
  // base, sinon un léger décalage vertical apparaît malgré le centrage.
  font-size: 1rem;
  line-height: 1.5;
  font-weight: 700;
}

.connexion-country-select :deep(.p-select-dropdown) {
  width: 1.6rem;
  color: var(--p-text-muted-color);
}

.connexion-country-select :deep(.p-select-filter) {
  // iOS zoome les champs < 16 px.
  font-size: 1rem;
}

.connexion-country-value {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  white-space: nowrap;
}

.connexion-country-value img {
  display: block;
  border-radius: 0.15rem;
}

.connexion-country-option-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
}

.connexion-country-option-row img {
  flex: 0 0 auto;
  border-radius: 0.15rem;
}

.connexion-country-option-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.connexion-country-option-dial {
  flex: 0 0 auto;
  color: var(--p-text-muted-color);
  font-weight: 700;
}

.connexion-phone input,
.connexion-password input {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  padding: 0 1rem;
  color: var(--p-text-color);
  background: transparent;
  border: 0;
  outline: 0;
  font: inherit;
  // iOS zoome automatiquement les champs dont le texte est inférieur à 16 px,
  // ce qui provoque un saut visuel au focus. Même line-height que le
  // sélecteur pays voisin pour que le texte soit sur la même ligne de base.
  font-size: 1rem;
  line-height: 1.5;
}

.connexion-password-toggle {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 100%;
  color: var(--p-text-muted-color);
  cursor: pointer;
  background: transparent;
  border: 0;
}

.connexion-field-error-slot {
  min-height: 1.3rem;
  margin-top: 0.3rem;
}

.connexion-error {
  margin: 0;
  color: var(--p-red-600, #dc2626);
  font-size: 0.82rem;
  font-weight: 600;
}

.connexion-submit {
  min-height: 3.25rem;
  color: var(--p-primary-contrast-color);
  cursor: pointer;
  background: var(--p-primary-color);
  border: 0;
  border-radius: 1rem;
  font-size: 1rem;
  font-weight: 800;
}

.connexion-submit:disabled {
  cursor: default;
  opacity: 0.7;
}

.connexion-forgot {
  display: block;
  margin-top: 1.1rem;
  color: var(--p-primary-color);
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  background: none;
  border: 0;
  font-size: 0.88rem;
  font-weight: 700;
}

.connexion-signup {
  margin-top: 1.5rem;
  color: var(--p-text-muted-color);
  text-align: center;
  font-size: 0.85rem;
}

.connexion-signup a {
  color: var(--p-primary-color);
  font-weight: 800;
  text-decoration: none;
}

// Tablette portrait uniquement (~768–1024px) : cette carte n'a pas le bug de
// hauteur forcée des écrans inscription/mot-de-passe-oublié (elle suit déjà
// sa propre hauteur), mais reste cohérente avec eux niveau largeur — un peu
// plus large que le point de rupture desktop (24rem) pour ne pas paraître
// trop étroite sur iPad. Le paysage tablette et le desktop gardent 24rem.
@media (min-width: 768px) and (max-width: 1024px) and (orientation: portrait) {
  .connexion-card {
    max-width: 28rem;
  }
}
</style>
