<script setup lang="ts">
import { $fetch as rawFetch, type IFetchError } from "ofetch";

definePageMeta({ layout: false });

useHead({
  title: "Inscription — Eau La Maman",
  meta: [
    {
      name: "viewport",
      content:
        "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
    },
    {
      name: "description",
      content: "Créez votre compte Eau La Maman depuis votre téléphone.",
    },
  ],
});

type RegistrationStep = "phone" | "identity" | "security" | "success";
type Country = { name: string; iso2: string; dial: string; digits: number };

const countries: Country[] = [
  { name: "Guinée", iso2: "GN", dial: "+224", digits: 9 },
  { name: "Sénégal", iso2: "SN", dial: "+221", digits: 9 },
  { name: "Mali", iso2: "ML", dial: "+223", digits: 8 },
  { name: "Côte d’Ivoire", iso2: "CI", dial: "+225", digits: 10 },
  { name: "Guinée-Bissau", iso2: "GW", dial: "+245", digits: 7 },
  { name: "Liberia", iso2: "LR", dial: "+231", digits: 8 },
  { name: "Sierra Leone", iso2: "SL", dial: "+232", digits: 8 },
  { name: "France", iso2: "FR", dial: "+33", digits: 9 },
];

const step = ref<RegistrationStep>("phone");
const selectedCode = ref("GN");
const phoneLocal = ref("");
const firstName = ref("");
const lastName = ref("");
const password = ref("");
const passwordConfirmation = ref("");
const showPassword = ref(false);
const showPasswordConfirmation = ref(false);
const isPrefilled = ref(false);
const isLoading = ref(false);
const globalError = ref("");
const errors = ref<Record<string, string>>({});
const isUiPreview = import.meta.dev;

const selectedCountry = computed(
  () => countries.find((country) => country.iso2 === selectedCode.value) ?? countries[0],
);

const normalizedLocalPhone = computed(() =>
  phoneLocal.value.replace(/\D/g, "").replace(/^0/, ""),
);

const telephone = computed(
  () => `${selectedCountry.value.dial}${normalizedLocalPhone.value}`,
);

const flagUrl = (iso2: string) =>
  `https://flagcdn.com/24x18/${iso2.toLowerCase()}.png`;

const steps: RegistrationStep[] = ["phone", "identity", "security"];

const currentStepNumber = computed(() => Math.max(1, steps.indexOf(step.value) + 1));
const progress = computed(() => `${(currentStepNumber.value / steps.length) * 100}%`);

const stepTitle = computed(() => {
  const titles: Record<RegistrationStep, string> = {
    phone: "Créer votre compte",
    identity: "Vos informations",
    security: "Votre mot de passe",
    success: "Compte créé",
  };

  return titles[step.value];
});

const passwordRules = computed(() => [
  { label: "8 caractères minimum", valid: password.value.length >= 8 },
  {
    label: "Une majuscule et une minuscule",
    valid: /[A-Z]/.test(password.value) && /[a-z]/.test(password.value),
  },
  { label: "Au moins un chiffre", valid: /\d/.test(password.value) },
  {
    label: "Au moins un symbole",
    valid: /[^\p{L}\p{N}\s]/u.test(password.value),
  },
]);

const allPasswordRulesValid = computed(() =>
  passwordRules.value.every((rule) => rule.valid),
);

const passwordStrength = computed(() => {
  const score = passwordRules.value.filter((rule) => rule.valid).length;

  if (!password.value) {
    return { label: "À compléter", percent: 0, tone: "is-empty" };
  }

  if (score <= 1) {
    return { label: "Faible", percent: 33, tone: "is-weak" };
  }

  if (score < passwordRules.value.length) {
    return { label: "Moyen", percent: 66, tone: "is-medium" };
  }

  return { label: "Fort", percent: 100, tone: "is-strong" };
});

const onPhoneInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const digits = target.value.replace(/\D/g, "").slice(0, 15);
  phoneLocal.value = digits;
  target.value = digits;
  errors.value.telephone = "";
  globalError.value = "";
};

watch(selectedCode, () => {
  phoneLocal.value = "";
  errors.value.telephone = "";
  globalError.value = "";
});

const validatePhone = () => {
  if (!phoneLocal.value) return "Le numéro de téléphone est obligatoire.";

  const digitCount = telephone.value.replace(/\D/g, "").length;
  if (digitCount < 7 || digitCount > 15) return "Numéro de téléphone invalide.";

  return "";
};

const validateIdentity = () => {
  const nextErrors: Record<string, string> = {};

  if (firstName.value.trim().length < 2) {
    nextErrors.prenom = "Le prénom doit contenir au moins 2 caractères.";
  }
  if (lastName.value.trim().length < 2) {
    nextErrors.nom = "Le nom doit contenir au moins 2 caractères.";
  }

  errors.value = nextErrors;
  return Object.keys(nextErrors).length === 0;
};

const validateSecurity = () => {
  const nextErrors: Record<string, string> = {};

  if (!password.value) {
    nextErrors.password = "Le mot de passe est obligatoire.";
  } else if (!allPasswordRulesValid.value) {
    nextErrors.password = "Le mot de passe ne respecte pas encore tous les critères.";
  }

  if (!passwordConfirmation.value) {
    nextErrors.password_confirmation = "Confirmez votre mot de passe.";
  } else if (password.value !== passwordConfirmation.value) {
    nextErrors.password_confirmation = "Les mots de passe ne correspondent pas.";
  }

  errors.value = nextErrors;
  return Object.keys(nextErrors).length === 0;
};

// Reproduit l'enveloppe d'erreur réelle : registrationProxy.ts (server/utils)
// relaie l'erreur Laravel via createError({ data: upstreamData }), que h3
// sérialise en imbriquant upstreamData sous "data" ; selon le point d'échec,
// le payload utile se trouve donc soit directement sur l'erreur, soit un
// niveau plus bas.
interface RegistrationErrorPayload {
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  data?: RegistrationErrorPayload;
}

const getServerPayload = (
  error: IFetchError<RegistrationErrorPayload>,
): RegistrationErrorPayload => {
  const outer = error.data || {};
  return outer.data || outer;
};

const applyServerError = (error: unknown) => {
  const fetchError = error as IFetchError<RegistrationErrorPayload>;
  const payload = getServerPayload(fetchError);
  const serverErrors = payload.errors || {};
  const mapped: Record<string, string> = {};

  Object.entries(serverErrors).forEach(([field, messages]) => {
    mapped[field] = Array.isArray(messages)
      ? String(messages[0] || "")
      : String(messages || "");
  });

  errors.value = mapped;
  globalError.value =
    payload.message ||
    payload.error ||
    fetchError.statusMessage ||
    "Une erreur est survenue. Veuillez réessayer.";
};

const checkPhone = async () => {
  const phoneError = validatePhone();
  if (phoneError) {
    errors.value = { telephone: phoneError };
    return false;
  }

  if (isUiPreview) {
    isPrefilled.value = false;
    errors.value = {};
    globalError.value = "";
    return true;
  }

  isLoading.value = true;
  errors.value = {};
  globalError.value = "";

  try {
    // Contrat exact de check-phone.post.ts (CheckPhoneResponse). $fetch
    // importé directement depuis "ofetch" (pas le $fetch global augmenté par
    // Nitro) : une fois toutes les routes server/api/auth/password/*
    // correctement typées, le "scoring" de route interne de Nitro (matching
    // du chemin contre toutes les routes connues via des types gabarits
    // récursifs) dépasse la profondeur de pile supportée par TypeScript sur
    // cet appel précis (TS2321 "Excessive stack depth" — reproduit en
    // environnement propre via npm ci isolé ; ni un cast du chemin en
    // `string`, ni une assertion sur le résultat n'évitent le calcul, qui a
    // lieu dès la résolution de l'appel). Le $fetch d'ofetch a un générique
    // ordinaire, sans cette machinerie.
    const response = await rawFetch<{
      status: "user_exists" | "prefill_available" | "not_found";
      prefill: { prenom: string; nom: string } | null;
    }>("/api/register/client/check-phone", {
      method: "POST",
      body: { telephone: telephone.value },
    });

    if (response.status === "user_exists") {
      errors.value = {
        telephone: "Ce numéro est déjà associé à un compte. Connectez-vous.",
      };
      return false;
    }

    if (response.prefill) {
      firstName.value = response.prefill.prenom || "";
      lastName.value = response.prefill.nom || "";
      isPrefilled.value = true;
    } else {
      isPrefilled.value = false;
    }

    return true;
  } catch (error) {
    applyServerError(error);
    return false;
  } finally {
    isLoading.value = false;
  }
};

const submitRegistration = async () => {
  if (!validateSecurity()) return;

  if (isUiPreview) {
    errors.value = {};
    globalError.value = "";
    step.value = "success";
    return;
  }

  isLoading.value = true;
  errors.value = {};
  globalError.value = "";

  try {
    await $fetch("/api/register/client", {
      method: "POST",
      body: {
        telephone: telephone.value,
        prenom: firstName.value.trim(),
        nom: lastName.value.trim(),
        password: password.value,
        password_confirmation: passwordConfirmation.value,
      },
    });

    step.value = "success";
  } catch (error) {
    applyServerError(error);
  } finally {
    isLoading.value = false;
  }
};

const next = async () => {
  errors.value = {};
  globalError.value = "";

  if (step.value === "phone") {
    if (await checkPhone()) step.value = "identity";
    return;
  }

  if (step.value === "identity") {
    if (validateIdentity()) step.value = "security";
    return;
  }

  if (step.value === "security") await submitRegistration();
};

const back = () => {
  if (isLoading.value) return;

  const index = steps.indexOf(step.value);
  if (index <= 0) {
    navigateTo("/");
    return;
  }

  step.value = steps[index - 1];
  errors.value = {};
  globalError.value = "";
};

const actionLabel = computed(() =>
  step.value === "security" ? "Créer mon compte" : "Continuer",
);
</script>

<template>
  <main class="registration-screen">
    <section v-if="step !== 'success'" class="registration-shell">
      <header class="registration-topbar">
        <button type="button" class="registration-back" aria-label="Retour" @click="back">
          <i class="pi pi-arrow-left" aria-hidden="true" />
        </button>
        <div class="registration-heading">
          <h1>{{ stepTitle }}</h1>
          <span>Étape {{ currentStepNumber }} sur 3</span>
        </div>
        <span class="registration-topbar-spacer" aria-hidden="true" />
      </header>

      <div class="registration-progress" aria-hidden="true">
        <span :style="{ width: progress }" />
      </div>

      <form class="registration-content" novalidate @submit.prevent="next">
        <div v-if="globalError" class="registration-alert" role="alert">
          <i class="pi pi-exclamation-circle" aria-hidden="true" />
          <span>{{ globalError }}</span>
        </div>

        <section v-if="step === 'phone'" class="registration-step">
          <div class="registration-step-copy">
            <h2>Votre numéro de téléphone</h2>
          </div>

          <label class="registration-field">
            <span>Numéro de téléphone</span>
            <div class="registration-phone" :class="{ 'has-error': errors.telephone }">
              <Select
                v-model="selectedCode"
                :options="countries"
                option-label="name"
                option-value="iso2"
                class="registration-country"
                aria-label="Choisir l’indicatif du pays"
              >
                <template #value>
                  <span class="registration-country-value">
                    <img :src="flagUrl(selectedCountry.iso2)" width="20" height="15" alt="">
                    <span>{{ selectedCountry.dial }}</span>
                  </span>
                </template>
                <template #option="{ option }">
                  <span class="registration-country-option">
                    <img :src="flagUrl(option.iso2)" width="20" height="15" alt="">
                    <span>{{ option.name }}</span>
                    <strong>{{ option.dial }}</strong>
                  </span>
                </template>
              </Select>
              <input
                :value="phoneLocal"
                type="tel"
                inputmode="numeric"
                autocomplete="tel-national"
                maxlength="15"
                :placeholder="`${selectedCountry.digits} chiffres indicatifs`"
                :aria-invalid="!!errors.telephone"
                :aria-describedby="errors.telephone ? 'registration-phone-error' : undefined"
                @input="onPhoneInput"
              >
            </div>
            <span
              v-if="errors.telephone"
              id="registration-phone-error"
              class="registration-error"
              role="alert"
            >
              {{ errors.telephone }}
            </span>
          </label>
        </section>

        <section v-else-if="step === 'identity'" class="registration-step">
          <div v-if="isPrefilled" class="registration-info">
            <i class="pi pi-check-circle" aria-hidden="true" />
            <span>Informations préremplies depuis nos dossiers.</span>
          </div>

          <div class="registration-step-copy registration-step-copy--compact">
            <h2>Comment vous appelez-vous ?</h2>
          </div>

          <label class="registration-field">
            <span>Prénom</span>
            <input
              v-model="firstName"
              type="text"
              autocomplete="given-name"
              placeholder="Ex. Moussa"
              :readonly="isPrefilled"
              :class="{ 'has-error': errors.prenom, 'is-readonly': isPrefilled }"
              :aria-invalid="!!errors.prenom"
              @input="errors.prenom = ''"
            >
            <span v-if="errors.prenom" class="registration-error" role="alert">
              {{ errors.prenom }}
            </span>
          </label>

          <label class="registration-field">
            <span>Nom</span>
            <input
              v-model="lastName"
              type="text"
              autocomplete="family-name"
              placeholder="Ex. Camara"
              :readonly="isPrefilled"
              :class="{ 'has-error': errors.nom, 'is-readonly': isPrefilled }"
              :aria-invalid="!!errors.nom"
              @input="errors.nom = ''"
            >
            <span v-if="errors.nom" class="registration-error" role="alert">
              {{ errors.nom }}
            </span>
          </label>
        </section>

        <section v-else-if="step === 'security'" class="registration-step">
          <label class="registration-field">
            <span>Mot de passe</span>
            <div class="registration-password" :class="{ 'has-error': errors.password }">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Votre mot de passe"
                :aria-invalid="!!errors.password"
                @input="errors.password = ''"
              >
              <button
                type="button"
                :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                @click="showPassword = !showPassword"
              >
                <i :class="['pi', showPassword ? 'pi-eye-slash' : 'pi-eye']" />
              </button>
            </div>
            <span v-if="errors.password" class="registration-error" role="alert">
              {{ errors.password }}
            </span>
          </label>

          <div class="registration-password-guidance">
            <div v-if="password" class="registration-strength">
              <div class="registration-strength-heading">
                <span>Force du mot de passe</span>
                <strong :class="passwordStrength.tone">{{ passwordStrength.label }}</strong>
              </div>
              <div
                class="registration-strength-track"
                role="progressbar"
                aria-label="Force du mot de passe"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-valuenow="passwordStrength.percent"
                :aria-valuetext="passwordStrength.label"
              >
                <span
                  :class="['registration-strength-fill', passwordStrength.tone]"
                  :style="{ width: `${passwordStrength.percent}%` }"
                />
              </div>
            </div>
            <p class="registration-password-requirements">
              8 caractères minimum, avec majuscule, minuscule, chiffre et symbole.
            </p>
          </div>

          <label class="registration-field">
            <span>Confirmer le mot de passe</span>
            <div class="registration-password" :class="{ 'has-error': errors.password_confirmation }">
              <input
                v-model="passwordConfirmation"
                :type="showPasswordConfirmation ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Répétez le mot de passe"
                :aria-invalid="!!errors.password_confirmation"
                @input="errors.password_confirmation = ''"
              >
              <button
                type="button"
                :aria-label="showPasswordConfirmation ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                @click="showPasswordConfirmation = !showPasswordConfirmation"
              >
                <i :class="['pi', showPasswordConfirmation ? 'pi-eye-slash' : 'pi-eye']" />
              </button>
            </div>
            <span v-if="errors.password_confirmation" class="registration-error" role="alert">
              {{ errors.password_confirmation }}
            </span>
          </label>
        </section>

        <div class="registration-actions">
          <button type="submit" class="registration-submit" :disabled="isLoading">
            <i v-if="isLoading" class="pi pi-spin pi-spinner" aria-hidden="true" />
            <span>{{ isLoading ? 'Veuillez patienter…' : actionLabel }}</span>
          </button>
          <p>Déjà un compte ? <NuxtLink to="/connexion">Se connecter</NuxtLink></p>
        </div>
      </form>
    </section>

    <section v-else class="registration-success">
      <div class="registration-success-content">
        <span class="registration-success-check" aria-hidden="true">
          <i class="pi pi-check" />
        </span>
        <h1>Compte créé</h1>
        <p>Vous pouvez maintenant vous connecter.</p>
      </div>

      <div class="registration-success-actions">
        <NuxtLink to="/connexion" class="registration-submit">Se connecter</NuxtLink>
        <NuxtLink to="/" class="registration-home-link">Retour à l’accueil</NuxtLink>
      </div>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.registration-screen {
  min-height: 100dvh;
  color: var(--p-text-color, #0f172a);
  background: var(--p-surface-100, #eef2f7);
  -webkit-text-size-adjust: 100%;
}

.registration-shell {
  width: 100%;
  max-width: 30rem;
  min-height: 100dvh;
  margin: 0 auto;
  background: var(--p-surface-50, #f8fafc);
}

.registration-topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  min-height: 72px;
  padding: max(0.75rem, env(safe-area-inset-top)) 1rem 0.75rem;
  background: color-mix(in srgb, var(--p-content-background, #fff) 94%, transparent);
  border-bottom: 1px solid var(--p-content-border-color, #e2e8f0);
  backdrop-filter: blur(14px);
}

.registration-back,
.registration-topbar-spacer {
  width: 44px;
  height: 44px;
}

.registration-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--p-text-color, #0f172a);
  cursor: pointer;
  background: var(--p-content-background, #fff);
  border: 1px solid var(--p-content-border-color, #e2e8f0);
  border-radius: 50%;
}

.registration-heading {
  min-width: 0;
  text-align: center;
}

.registration-heading h1 {
  margin: 0;
  overflow: hidden;
  font-size: 1rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.registration-heading span {
  display: block;
  margin-top: 0.15rem;
  color: var(--p-text-muted-color, #64748b);
  font-size: 0.75rem;
}

.registration-progress {
  position: sticky;
  top: 72px;
  z-index: 11;
  height: 3px;
  overflow: hidden;
  background: var(--p-surface-200, #e2e8f0);
}

.registration-progress span {
  display: block;
  height: 100%;
  background: var(--p-primary-color, #2563eb);
  transition: width 0.25s ease;
}

.registration-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: calc(100dvh - 75px);
  margin: 0 auto;
  padding: 1.5rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom));
}

.registration-step {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 1.15rem;
}

.registration-step-copy {
  text-align: center;
}

.registration-step-copy--compact {
  margin-bottom: 0.25rem;
}

.registration-step-copy h2 {
  margin: 0 0 0.5rem;
  font-size: 1.3rem;
  font-weight: 800;
}

.registration-step-copy p {
  max-width: 24rem;
  margin: 0 auto;
  color: var(--p-text-muted-color, #64748b);
  font-size: 0.9rem;
  line-height: 1.55;
}

.registration-field {
  display: flex;
  flex-direction: column;
  gap: 0.42rem;
  color: var(--p-text-color, #0f172a);
  font-size: 0.84rem;
  font-weight: 750;
}

.registration-field > input,
.registration-phone,
.registration-password {
  width: 100%;
  height: 3.25rem;
  color: var(--p-text-color, #0f172a);
  background: var(--p-content-background, #fff);
  border: 1px solid var(--p-content-border-color, #e2e8f0);
  border-radius: 1rem;
  outline: 0;
}

.registration-field > input {
  padding: 0 1rem;
  font: inherit;
  font-size: 1rem;
}

.registration-field > input:focus,
.registration-phone:focus-within,
.registration-password:focus-within {
  border-color: var(--p-primary-color, #2563eb);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--p-primary-color, #2563eb) 14%, transparent);
}

.registration-field .has-error,
.registration-field > input.has-error {
  border-color: var(--p-red-500, #ef4444);
}

.registration-field > input.is-readonly {
  color: var(--p-text-muted-color, #64748b);
  background: var(--p-surface-100, #f1f5f9);
}

.registration-phone,
.registration-password {
  display: flex;
  align-items: stretch;
  overflow: hidden;
}

.registration-phone > input,
.registration-password > input {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  padding: 0 0.9rem;
  color: inherit;
  background: transparent;
  border: 0;
  outline: 0;
  font: inherit;
  font-size: 1rem;
}

.registration-country.p-select {
  flex: 0 0 auto;
  height: 100%;
  background: transparent;
  border: 0;
  border-right: 1px solid var(--p-content-border-color, #e2e8f0);
  border-radius: 0;
}

.registration-country :deep(.p-select-label) {
  display: flex;
  align-items: center;
  padding: 0 0.35rem 0 0.8rem;
  font-size: 0.95rem;
  font-weight: 750;
}

.registration-country :deep(.p-select-dropdown) {
  width: 1.6rem;
}

.registration-country-value,
.registration-country-option {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.registration-country-option {
  width: 100%;
}

.registration-country-option strong {
  margin-left: auto;
}

.registration-country-value img,
.registration-country-option img {
  border-radius: 0.1rem;
}

.registration-password button {
  display: inline-flex;
  flex: 0 0 3.25rem;
  align-items: center;
  justify-content: center;
  color: var(--p-text-muted-color, #64748b);
  cursor: pointer;
  background: transparent;
  border: 0;
}

.registration-error {
  margin: 0;
  color: var(--p-red-600, #dc2626);
  font-size: 0.78rem;
  font-weight: 650;
  line-height: 1.35;
}

.registration-alert,
.registration-info {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  padding: 0.8rem 0.9rem;
  margin-bottom: 1rem;
  border-radius: 0.85rem;
  font-size: 0.8rem;
  line-height: 1.45;
}

.registration-alert {
  color: var(--p-red-700, #b91c1c);
  background: var(--p-red-50, #fef2f2);
  border: 1px solid var(--p-red-200, #fecaca);
}

.registration-info {
  color: var(--p-primary-color, #2563eb);
  background: color-mix(in srgb, var(--p-primary-color, #2563eb) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--p-primary-color, #2563eb) 28%, transparent);
}

.registration-password-guidance,
.registration-strength {
  display: flex;
  flex-direction: column;
}

.registration-password-guidance {
  gap: 0.55rem;
  margin-top: -0.35rem;
}

.registration-strength {
  gap: 0.45rem;
}

.registration-strength-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--p-text-muted-color, #64748b);
  font-size: 0.76rem;
}

.registration-strength-heading strong {
  font-weight: 750;
}

.registration-strength-heading .is-empty {
  color: var(--p-text-muted-color, #64748b);
}

.registration-strength-heading .is-weak {
  color: var(--p-red-600, #dc2626);
}

.registration-strength-heading .is-medium {
  color: var(--p-orange-600, #ea580c);
}

.registration-strength-heading .is-strong {
  color: var(--p-green-600, #16a34a);
}

.registration-strength-track {
  height: 0.4rem;
  overflow: hidden;
  background: var(--p-surface-200, #e2e8f0);
  border-radius: 999px;
}

.registration-strength-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.2s ease, background-color 0.2s ease;
}

.registration-strength-fill.is-weak {
  background: var(--p-red-500, #ef4444);
}

.registration-strength-fill.is-medium {
  background: var(--p-orange-500, #f97316);
}

.registration-strength-fill.is-strong {
  background: var(--p-green-500, #22c55e);
}

.registration-password-requirements {
  margin: 0;
  color: var(--p-text-muted-color, #64748b);
  font-size: 0.72rem;
  line-height: 1.4;
}

.registration-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1.5rem;
  margin-top: auto;
}

.registration-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 3.25rem;
  gap: 0.55rem;
  color: var(--p-primary-contrast-color, #fff);
  cursor: pointer;
  background: var(--p-primary-color, #2563eb);
  border: 0;
  border-radius: 1rem;
  font-size: 1rem;
  font-weight: 800;
  text-decoration: none;
}

.registration-submit:disabled {
  cursor: default;
  opacity: 0.7;
}

.registration-actions p {
  margin: 0;
  color: var(--p-text-muted-color, #64748b);
  text-align: center;
  font-size: 0.84rem;
}

.registration-actions a,
.registration-home-link {
  color: var(--p-primary-color, #2563eb);
  font-weight: 750;
  text-decoration: none;
}

.registration-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: min(100%, 28rem);
  min-height: 100dvh;
  padding: 2rem 1.5rem calc(2rem + env(safe-area-inset-bottom));
  margin: 0 auto;
  text-align: center;
}

.registration-success-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.registration-success-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  color: var(--p-green-700, #15803d);
  background: var(--p-green-100, #dcfce7);
  border-radius: 50%;
  font-size: 1.45rem;
}

.registration-success h1 {
  margin: 1.25rem 0 0;
  font-size: 1.5rem;
  font-weight: 850;
}

.registration-success p {
  max-width: 24rem;
  margin: 0.5rem 0 0;
  color: var(--p-text-muted-color, #64748b);
  line-height: 1.55;
}

.registration-success-actions {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 2rem;
}

.registration-home-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 1rem;
  font-size: 0.86rem;
}

@media (min-width: 640px) {
  .registration-screen {
    padding: 2rem;
  }

  // La carte suit désormais la hauteur de son contenu (formulaire par étape)
  // au lieu d'un min-height artificiel (min(50rem, ...)) qui laissait un
  // grand vide sous les actions sur tablette/desktop. margin-top la place
  // dans le tiers supérieur de l'écran plutôt que collée en haut ou centrée
  // pile au milieu (ce qui paraît trop bas sur les grands écrans).
  .registration-shell {
    min-height: 0;
    margin: min(8dvh, 4rem) auto 3rem;
    overflow: hidden;
    border: 1px solid var(--p-content-border-color, #e2e8f0);
    border-radius: 1.5rem;
    box-shadow: 0 24px 70px rgb(15 23 42 / 12%);
  }

  .registration-content {
    min-height: 0;
  }

  .registration-success {
    min-height: calc(100dvh - 4rem);
  }
}

// Tablette portrait uniquement (~768–1024px) : une carte nettement plus
// large que le point de rupture desktop (30rem) ci-dessus, en restant à une
// seule colonne — un formulaire pensé pour iPad, pas un écran téléphone
// posé au centre. Le paysage tablette et le desktop gardent 30rem. L'écran
// de succès (centré plein écran, sans vide "en dessous d'un bouton") n'a
// pas ce défaut et reste inchangé.
@media (min-width: 768px) and (max-width: 1024px) and (orientation: portrait) {
  .registration-shell {
    max-width: 34rem;
  }
}

@media (max-width: 359px) {
  .registration-content {
    padding-inline: 1rem;
  }

}
</style>
