<script setup lang="ts">
import type { IFetchError } from "ofetch";

definePageMeta({ layout: false });

useHead({
  title: "Mot de passe oublié — Eau La Maman",
  meta: [
    {
      name: "viewport",
      content:
        "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
    },
  ],
});

type Country = { name: string; iso2: string; dial: string; digits: number };
type ForgotStep = "phone" | "otp" | "password" | "done";

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

const selectedCode = ref("GN");
const phoneLocal = ref("");
const step = ref<ForgotStep>("phone");
const otp = ref("");
const password = ref("");
const passwordConfirmation = ref("");
const showPassword = ref(false);
const showPasswordConfirmation = ref(false);
const error = ref("");
const globalError = ref("");
const isLoading = ref(false);
const maskedEmail = ref("");
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

const stepTitle = computed(() => {
  const titles: Record<ForgotStep, string> = {
    phone: "Mot de passe oublié",
    otp: "Vérification",
    password: "Nouveau mot de passe",
    done: "Mot de passe modifié",
  };

  return titles[step.value];
});

const passwordRules = computed(() => [
  { valid: password.value.length >= 8 },
  {
    valid: /[A-Z]/.test(password.value) && /[a-z]/.test(password.value),
  },
  { valid: /[^\p{L}\p{N}\s]/u.test(password.value) },
]);

const passwordIsValid = computed(() =>
  passwordRules.value.every((rule) => rule.valid),
);

const passwordStrength = computed(() => {
  const score = passwordRules.value.filter((rule) => rule.valid).length;

  if (score <= 1) return { label: "Faible", percent: 33, tone: "is-weak" };
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
  error.value = "";
  globalError.value = "";
};

watch(selectedCode, () => {
  phoneLocal.value = "";
  error.value = "";
  globalError.value = "";
});

// Même enveloppe d'erreur que passwordResetProxy.ts (server/utils) : celui-ci
// relaie l'erreur Laravel via createError({ data: upstreamData }), que h3
// imbrique sous "data" à la sérialisation.
interface PasswordResetErrorPayload {
  message?: string;
  error?: string;
  data?: PasswordResetErrorPayload;
}

const applyRequestError = (requestError: unknown, fallback: string) => {
  const fetchError = requestError as IFetchError<PasswordResetErrorPayload>;
  const payload = fetchError.data?.data || fetchError.data || {};
  globalError.value =
    payload.error ||
    payload.message ||
    fetchError.statusMessage ||
    fallback;
};

const submitPhone = async () => {
  error.value = "";
  globalError.value = "";

  if (!phoneLocal.value) {
    error.value = "Le numéro de téléphone est obligatoire.";
    return;
  }

  const digitCount = telephone.value.replace(/\D/g, "").length;
  if (digitCount < 7 || digitCount > 15) {
    error.value = "Numéro de téléphone invalide.";
    return;
  }

  if (isUiPreview) {
    maskedEmail.value = "i***@exemple.com";
    step.value = "otp";
    return;
  }

  isLoading.value = true;

  try {
    // Type inféré automatiquement par Nuxt depuis lookup.post.ts
    // (PasswordLookupResponse) — pas de générique explicite : cette route est
    // connue littéralement par le $fetch typé de Nuxt, qui n'accepte pas de
    // paramètre de type pour les chemins reconnus (même pattern que
    // pages/inscription.vue).
    const response = await $fetch(
      "/api/auth/password/lookup",
      {
        method: "POST",
        body: { telephone: telephone.value },
      },
    );

    maskedEmail.value = response.masked_email;
    step.value = "otp";
  } catch (requestError) {
    applyRequestError(requestError, "Impossible d’envoyer le code pour le moment.");
  } finally {
    isLoading.value = false;
  }
};

const onOtpInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const digits = target.value.replace(/\D/g, "").slice(0, 6);
  otp.value = digits;
  target.value = digits;
  error.value = "";
  globalError.value = "";
};

const submitOtp = async () => {
  error.value = "";
  globalError.value = "";

  if (otp.value.length !== 6) {
    error.value = "Saisissez le code à 6 chiffres.";
    return;
  }

  if (isUiPreview) {
    step.value = "password";
    return;
  }

  isLoading.value = true;

  try {
    await $fetch("/api/auth/password/verify", {
      method: "POST",
      body: { telephone: telephone.value, code: otp.value },
    });
    step.value = "password";
  } catch (requestError) {
    applyRequestError(requestError, "Impossible de vérifier le code pour le moment.");
  } finally {
    isLoading.value = false;
  }
};

const submitPassword = async () => {
  error.value = "";
  globalError.value = "";

  if (!passwordIsValid.value) {
    error.value = "Le mot de passe ne respecte pas encore les critères.";
    return;
  }

  if (password.value !== passwordConfirmation.value) {
    error.value = "Les mots de passe ne correspondent pas.";
    return;
  }

  if (isUiPreview) {
    step.value = "done";
    return;
  }

  isLoading.value = true;

  try {
    await $fetch("/api/auth/password/reset", {
      method: "POST",
      body: {
        telephone: telephone.value,
        password: password.value,
        password_confirmation: passwordConfirmation.value,
      },
    });
    step.value = "done";
  } catch (requestError) {
    applyRequestError(
      requestError,
      "Impossible de modifier le mot de passe pour le moment.",
    );
  } finally {
    isLoading.value = false;
  }
};

const submit = async () => {
  if (step.value === "phone") await submitPhone();
  else if (step.value === "otp") await submitOtp();
  else if (step.value === "password") await submitPassword();
};

const back = () => {
  if (isLoading.value) return;

  error.value = "";
  globalError.value = "";

  if (step.value === "password") {
    step.value = "otp";
  } else if (step.value === "otp") {
    step.value = "phone";
  } else {
    navigateTo("/connexion");
  }
};
</script>

<template>
  <main class="forgot-screen">
    <section class="forgot-shell">
      <header class="forgot-topbar">
        <button type="button" class="forgot-back" aria-label="Retour" @click="back">
          <i class="pi pi-arrow-left" aria-hidden="true" />
        </button>
        <h1>{{ stepTitle }}</h1>
        <span aria-hidden="true" />
      </header>

      <div v-if="step === 'phone'" class="forgot-content">
        <div class="forgot-copy">
          <span class="forgot-icon" aria-hidden="true">
            <i class="pi pi-envelope" />
          </span>
          <h2>Recevoir un code</h2>
          <p>Le code sera envoyé à l’adresse e-mail associée à votre compte.</p>
        </div>

        <form class="forgot-form" novalidate @submit.prevent="submit">
          <div v-if="globalError" class="forgot-alert" role="alert">
            {{ globalError }}
          </div>

          <label class="forgot-field">
            <span>Numéro de téléphone</span>
            <div class="forgot-phone" :class="{ 'has-error': error }">
              <Select
                v-model="selectedCode"
                :options="countries"
                option-label="name"
                option-value="iso2"
                class="forgot-country"
                aria-label="Choisir l’indicatif du pays"
              >
                <template #value>
                  <span class="forgot-country-value">
                    <img :src="flagUrl(selectedCountry.iso2)" width="20" height="15" alt="">
                    <span>{{ selectedCountry.dial }}</span>
                  </span>
                </template>
                <template #option="{ option }">
                  <span class="forgot-country-option">
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
                :aria-invalid="!!error"
                aria-describedby="forgot-phone-error"
                @input="onPhoneInput"
              >
            </div>
            <span v-if="error" id="forgot-phone-error" class="forgot-error" role="alert">
              {{ error }}
            </span>
          </label>

          <button type="submit" class="forgot-submit" :disabled="isLoading">
            <i v-if="isLoading" class="pi pi-spin pi-spinner" aria-hidden="true" />
            <span>{{ isLoading ? "Envoi…" : "Envoyer le code" }}</span>
          </button>
        </form>

        <NuxtLink to="/connexion" class="forgot-login-link">Retour à la connexion</NuxtLink>
      </div>

      <div v-else-if="step === 'otp'" class="forgot-content">
        <div class="forgot-copy">
          <span class="forgot-icon" aria-hidden="true">
            <i class="pi pi-shield" />
          </span>
          <h2>Saisissez le code</h2>
          <p>Le code à 6 chiffres a été envoyé à <strong>{{ maskedEmail }}</strong>.</p>
        </div>

        <form class="forgot-form" novalidate @submit.prevent="submit">
          <div v-if="globalError" class="forgot-alert" role="alert">
            {{ globalError }}
          </div>

          <label class="forgot-field forgot-field--centered">
            <span>Code de vérification</span>
            <input
              :value="otp"
              class="forgot-otp"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              placeholder="000000"
              :aria-invalid="!!error"
              @input="onOtpInput"
            >
            <span v-if="error" class="forgot-error" role="alert">{{ error }}</span>
          </label>

          <button type="submit" class="forgot-submit" :disabled="isLoading">
            <i v-if="isLoading" class="pi pi-spin pi-spinner" aria-hidden="true" />
            <span>{{ isLoading ? "Vérification…" : "Vérifier le code" }}</span>
          </button>

          <button
            type="button"
            class="forgot-secondary"
            :disabled="isLoading"
            @click="submitPhone"
          >
            Renvoyer le code
          </button>
        </form>
      </div>

      <div v-else-if="step === 'password'" class="forgot-content">
        <div class="forgot-copy">
          <h2>Choisissez votre mot de passe</h2>
        </div>

        <form class="forgot-form" novalidate @submit.prevent="submit">
          <div v-if="globalError" class="forgot-alert" role="alert">
            {{ globalError }}
          </div>

          <label class="forgot-field">
            <span>Nouveau mot de passe</span>
            <div class="forgot-password">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Votre nouveau mot de passe"
                @input="error = ''"
              >
              <button
                type="button"
                :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                @click="showPassword = !showPassword"
              >
                <i :class="['pi', showPassword ? 'pi-eye-slash' : 'pi-eye']" />
              </button>
            </div>
          </label>

          <div class="forgot-password-guidance">
            <div v-if="password" class="forgot-strength">
              <div class="forgot-strength-heading">
                <span>Force du mot de passe</span>
                <strong :class="passwordStrength.tone">{{ passwordStrength.label }}</strong>
              </div>
              <div class="forgot-strength-track" aria-hidden="true">
                <span
                  :class="['forgot-strength-fill', passwordStrength.tone]"
                  :style="{ width: `${passwordStrength.percent}%` }"
                />
              </div>
            </div>
            <p>8 caractères minimum, avec majuscule, minuscule et symbole.</p>
          </div>

          <label class="forgot-field">
            <span>Confirmer le mot de passe</span>
            <div class="forgot-password" :class="{ 'has-error': error }">
              <input
                v-model="passwordConfirmation"
                :type="showPasswordConfirmation ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Répétez le mot de passe"
                :aria-invalid="!!error"
                @input="error = ''"
              >
              <button
                type="button"
                :aria-label="showPasswordConfirmation ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                @click="showPasswordConfirmation = !showPasswordConfirmation"
              >
                <i :class="['pi', showPasswordConfirmation ? 'pi-eye-slash' : 'pi-eye']" />
              </button>
            </div>
            <span v-if="error" class="forgot-error" role="alert">{{ error }}</span>
          </label>

          <button type="submit" class="forgot-submit" :disabled="isLoading">
            <i v-if="isLoading" class="pi pi-spin pi-spinner" aria-hidden="true" />
            <span>{{ isLoading ? "Enregistrement…" : "Enregistrer le mot de passe" }}</span>
          </button>
        </form>
      </div>

      <div v-else class="forgot-success">
        <span class="forgot-success-icon forgot-success-icon--done" aria-hidden="true">
          <i class="pi pi-check" />
        </span>
        <h2>Mot de passe modifié</h2>
        <p>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
        <NuxtLink to="/connexion" class="forgot-submit">Se connecter</NuxtLink>
      </div>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.forgot-screen {
  min-height: 100dvh;
  color: var(--p-text-color, #0f172a);
  background: var(--p-surface-100, #eef2f7);
  -webkit-text-size-adjust: 100%;
}

.forgot-shell {
  width: 100%;
  max-width: 30rem;
  min-height: 100dvh;
  margin: 0 auto;
  background: var(--p-surface-50, #f8fafc);
}

.forgot-topbar {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  min-height: 72px;
  padding: max(0.75rem, env(safe-area-inset-top)) 1rem 0.75rem;
  background: var(--p-content-background, #fff);
  border-bottom: 1px solid var(--p-content-border-color, #e2e8f0);
}

.forgot-topbar h1 {
  margin: 0;
  text-align: center;
  font-size: 1rem;
  font-weight: 800;
}

.forgot-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: var(--p-text-color, #0f172a);
  background: var(--p-content-background, #fff);
  border: 1px solid var(--p-content-border-color, #e2e8f0);
  border-radius: 50%;
  cursor: pointer;
  text-decoration: none;
}

.forgot-content,
.forgot-success {
  display: flex;
  min-height: calc(100dvh - 72px);
  flex-direction: column;
  padding: 2rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom));
}

.forgot-copy,
.forgot-success {
  align-items: center;
  text-align: center;
}

.forgot-icon,
.forgot-success-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  color: var(--p-primary-color, #2563eb);
  background: color-mix(in srgb, var(--p-primary-color, #2563eb) 12%, transparent);
  border-radius: 1rem;
  font-size: 1.25rem;
}

.forgot-copy h2,
.forgot-success h2 {
  margin: 1rem 0 0;
  font-size: 1.35rem;
  font-weight: 800;
}

.forgot-copy p,
.forgot-success p {
  max-width: 23rem;
  margin: 0.5rem 0 0;
  color: var(--p-text-muted-color, #64748b);
  font-size: 0.88rem;
  line-height: 1.5;
}

.forgot-copy p strong {
  color: var(--p-text-color, #0f172a);
}

.forgot-form {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 1.25rem;
  margin-top: 2rem;
}

.forgot-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  text-align: left;
  font-size: 0.84rem;
  font-weight: 750;
}

.forgot-field--centered {
  align-items: center;
  text-align: center;
}

.forgot-phone {
  display: flex;
  width: 100%;
  height: 3.25rem;
  align-items: stretch;
  overflow: hidden;
  background: var(--p-content-background, #fff);
  border: 1px solid var(--p-content-border-color, #e2e8f0);
  border-radius: 1rem;
}

.forgot-phone:focus-within {
  border-color: var(--p-primary-color, #2563eb);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--p-primary-color, #2563eb) 14%, transparent);
}

.forgot-phone.has-error {
  border-color: var(--p-red-500, #ef4444);
}

.forgot-otp {
  width: 100%;
  height: 3.5rem;
  padding: 0 1rem 0 1.55rem;
  color: var(--p-text-color, #0f172a);
  background: var(--p-content-background, #fff);
  border: 1px solid var(--p-content-border-color, #e2e8f0);
  border-radius: 1rem;
  outline: 0;
  text-align: center;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0.55rem;
}

.forgot-otp:focus {
  border-color: var(--p-primary-color, #2563eb);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--p-primary-color, #2563eb) 14%, transparent);
}

.forgot-otp[aria-invalid="true"] {
  border-color: var(--p-red-500, #ef4444);
}

.forgot-password {
  display: flex;
  width: 100%;
  height: 3.25rem;
  align-items: stretch;
  overflow: hidden;
  background: var(--p-content-background, #fff);
  border: 1px solid var(--p-content-border-color, #e2e8f0);
  border-radius: 1rem;
}

.forgot-password:focus-within {
  border-color: var(--p-primary-color, #2563eb);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--p-primary-color, #2563eb) 14%, transparent);
}

.forgot-password.has-error {
  border-color: var(--p-red-500, #ef4444);
}

.forgot-password input {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  padding: 0 1rem;
  color: inherit;
  background: transparent;
  border: 0;
  outline: 0;
  font: inherit;
  font-size: 1rem;
}

.forgot-password button {
  display: inline-flex;
  flex: 0 0 3.25rem;
  align-items: center;
  justify-content: center;
  color: var(--p-text-muted-color, #64748b);
  cursor: pointer;
  background: transparent;
  border: 0;
}

.forgot-password-guidance,
.forgot-strength {
  display: flex;
  flex-direction: column;
}

.forgot-password-guidance {
  gap: 0.55rem;
  margin-top: -0.4rem;
}

.forgot-password-guidance p {
  margin: 0;
  color: var(--p-text-muted-color, #64748b);
  font-size: 0.72rem;
  line-height: 1.4;
}

.forgot-strength {
  gap: 0.45rem;
}

.forgot-strength-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--p-text-muted-color, #64748b);
  font-size: 0.76rem;
}

.forgot-strength-heading .is-weak {
  color: var(--p-red-600, #dc2626);
}

.forgot-strength-heading .is-medium {
  color: var(--p-orange-600, #ea580c);
}

.forgot-strength-heading .is-strong {
  color: var(--p-green-600, #16a34a);
}

.forgot-strength-track {
  height: 0.4rem;
  overflow: hidden;
  background: var(--p-surface-200, #e2e8f0);
  border-radius: 999px;
}

.forgot-strength-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.2s ease, background-color 0.2s ease;
}

.forgot-strength-fill.is-weak {
  background: var(--p-red-500, #ef4444);
}

.forgot-strength-fill.is-medium {
  background: var(--p-orange-500, #f97316);
}

.forgot-strength-fill.is-strong {
  background: var(--p-green-500, #22c55e);
}

.forgot-phone > input {
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

.forgot-country.p-select {
  flex: 0 0 auto;
  height: 100%;
  background: transparent;
  border: 0;
  border-right: 1px solid var(--p-content-border-color, #e2e8f0);
  border-radius: 0;
}

.forgot-country :deep(.p-select-label) {
  display: flex;
  align-items: center;
  padding: 0 0.35rem 0 0.8rem;
  font-size: 0.95rem;
  font-weight: 750;
}

.forgot-country :deep(.p-select-dropdown) {
  width: 1.6rem;
}

.forgot-country-value,
.forgot-country-option {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.forgot-country-option {
  width: 100%;
}

.forgot-country-option strong {
  margin-left: auto;
}

.forgot-country-value img,
.forgot-country-option img {
  border-radius: 0.1rem;
}

.forgot-error {
  color: var(--p-red-600, #dc2626);
  font-size: 0.78rem;
  font-weight: 650;
}

.forgot-alert {
  padding: 0.8rem 0.9rem;
  color: var(--p-red-700, #b91c1c);
  background: var(--p-red-50, #fef2f2);
  border: 1px solid var(--p-red-200, #fecaca);
  border-radius: 0.85rem;
  font-size: 0.8rem;
  line-height: 1.45;
}

.forgot-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 3.25rem;
  gap: 0.5rem;
  color: var(--p-primary-contrast-color, #fff);
  cursor: pointer;
  background: var(--p-primary-color, #2563eb);
  border: 0;
  border-radius: 1rem;
  font-size: 1rem;
  font-weight: 800;
  text-decoration: none;
}

.forgot-submit:disabled {
  opacity: 0.7;
}

.forgot-secondary {
  min-height: 44px;
  color: var(--p-primary-color, #2563eb);
  cursor: pointer;
  background: transparent;
  border: 0;
  font-size: 0.86rem;
  font-weight: 750;
}

.forgot-secondary:disabled {
  opacity: 0.6;
}

.forgot-login-link {
  min-height: 44px;
  padding: 0.8rem;
  margin-top: 0.75rem;
  color: var(--p-primary-color, #2563eb);
  text-align: center;
  font-size: 0.86rem;
  font-weight: 750;
  text-decoration: none;
}

.forgot-success {
  justify-content: center;
}

.forgot-success p {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.forgot-success p strong {
  color: var(--p-text-color, #0f172a);
}

.forgot-success .forgot-submit {
  margin-top: 2rem;
}

.forgot-success-icon--done {
  color: var(--p-green-700, #15803d);
  background: var(--p-green-100, #dcfce7);
  border-radius: 50%;
}

@media (min-width: 640px) {
  .forgot-screen {
    padding: 2rem;
  }

  // La carte suit désormais la hauteur de son contenu (formulaire court) au
  // lieu d'un min-height artificiel (min(45rem, ...)) qui laissait un grand
  // vide sous le bouton sur tablette/desktop. margin-top la place dans le
  // tiers supérieur de l'écran plutôt que collée en haut ou centrée pile au
  // milieu (ce qui paraît trop bas sur les grands écrans).
  .forgot-shell {
    min-height: 0;
    margin: min(8dvh, 4rem) auto 3rem;
    overflow: hidden;
    border: 1px solid var(--p-content-border-color, #e2e8f0);
    border-radius: 1.5rem;
    box-shadow: 0 24px 70px rgb(15 23 42 / 12%);
  }

  .forgot-content,
  .forgot-success {
    min-height: 0;
  }
}

// Tablette portrait uniquement (~768–1024px) : une carte nettement plus
// large que le point de rupture desktop (30rem) ci-dessus, en restant à une
// seule colonne — un formulaire pensé pour iPad, pas un écran téléphone
// posé au centre. Le paysage tablette et le desktop gardent 30rem.
@media (min-width: 768px) and (max-width: 1024px) and (orientation: portrait) {
  .forgot-shell {
    max-width: 34rem;
  }
}
</style>
