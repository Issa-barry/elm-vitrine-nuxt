<script setup lang="ts">
definePageMeta({ layout: "client", middleware: "auth" });
useHead({ title: "Mon profil — Eau La Maman" });

// Deux sources de vérité distinctes, jamais fusionnées (voir
// config/clientProfile.ts) :
//   - useAuth() / GET /api/auth/me  -> identité minimale + session (déjà
//     chargée par middleware/auth.ts avant que cette page ne s'affiche) ;
//   - useClientProfile() / GET /v1/mobile/profile -> fiche métier plus lourde
//     (localisation, entreprise, préférences), chargée ici spécifiquement,
//     l'écran "Mon profil" étant le seul à en avoir besoin.
const auth = useAuth();
const { user, context } = auth;

const clientProfile = useClientProfile();
const { profile, isLoading: isProfileLoading, isSavingLocalisation, isSavingNotifications, error: profileError } = clientProfile;

const router = useRouter();
const isLoggingOut = ref(false);

const handleLogout = async () => {
  if (isLoggingOut.value) return;
  isLoggingOut.value = true;
  await auth.logout();
  router.push("/connexion");
};

// Initiales de l'avatar : calculées depuis le vrai prénom/nom, jamais une
// valeur fictive ("IM"). Repli sur "?" uniquement si /me n'a pas encore
// répondu (ne devrait pas arriver ici, le garde de route l'exige déjà).
const initials = computed(() => {
  const first = user.value?.prenom?.trim()?.[0] || "";
  const last = user.value?.nom?.trim()?.[0] || "";
  return (first + last).toUpperCase() || "?";
});

const fullName = computed(() => {
  const parts = [user.value?.prenom, user.value?.nom].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
});

// Regroupement d'affichage uniquement (utils/phone.ts, testé
// indépendamment) — la valeur envoyée à Laravel reste toujours celle
// normalisée par PhoneNormalizer côté backend, jamais cette forme affichée.
const formattedPhone = computed(() => formatPhoneNumber(user.value?.telephone));

// "Compte propriétaire/client/livreur" dérivé de `context` (résolu côté
// backend par ClientIdentityResolver), jamais des rôles bruts : un compte
// peut cumuler un rôle staff (super_admin, admin_entreprise...) et un rôle
// espace client (voir composables/useAuth.ts, config/auth.ts). `context`
// reste la seule source fiable de "quelle identité métier ce compte a
// réellement ici" — plusieurs libellés possibles si plusieurs contextes sont
// renseignés à la fois. Pas de "Actif depuis..." : /me ne fournit aucune date
// de ce type, une valeur inventée ne serait pas honnête.
const accountTypeLabel = computed(() => {
  const ctx = context.value;
  if (!ctx) return "";
  const labels: string[] = [];
  if (ctx.proprietaire_id) labels.push("Compte propriétaire");
  if (ctx.client_id) labels.push("Compte client");
  if (ctx.livreur_id) labels.push("Compte livreur");
  return labels.join(" · ");
});

// Champs de localisation : les 3 seuls modifiables par l'espace client
// (UpdateProfileRequest côté backend n'accepte que pays/code_pays/ville/
// adresse — code_pays volontairement pas exposé ici, un simple champ texte
// ne suffirait pas à le renseigner correctement sans un vrai sélecteur pays,
// hors périmètre de cette page). Initialisés dès que /profile répond, et à
// chaque fois qu'il est rechargé/mis à jour — jamais une valeur de
// démonstration en repli.
const localisationForm = reactive({ pays: "", ville: "", adresse: "" });
watch(
  profile,
  (value) => {
    localisationForm.pays = value?.localisation?.pays || "";
    localisationForm.ville = value?.localisation?.ville || "";
    localisationForm.adresse = value?.localisation?.adresse || "";
  },
  { immediate: true },
);

const localisationSaveMessage = ref("");
const localisationSaveIsError = ref(false);

const saveLocalisation = async () => {
  localisationSaveMessage.value = "";
  const result = await clientProfile.updateLocalisation({
    pays: localisationForm.pays || null,
    ville: localisationForm.ville || null,
    adresse: localisationForm.adresse || null,
  });
  localisationSaveIsError.value = !result.ok;
  localisationSaveMessage.value = result.ok
    ? "Localisation mise à jour."
    : result.error.message;
};

const notificationSaveMessage = ref("");
const notificationSaveIsError = ref(false);

// Non optimiste (voir composables/useClientProfile.ts) : le toggle ne change
// visuellement qu'après confirmation du backend — v-model direct sur
// profile.notifications.activite provoquerait un changement visuel immédiat
// suivi d'un rollback en cas d'échec, jamais testé ici.
const onToggleNotifications = async (nextValue: boolean) => {
  notificationSaveMessage.value = "";
  const result = await clientProfile.updateNotificationPreference(nextValue);
  notificationSaveIsError.value = !result.ok;
  notificationSaveMessage.value = result.ok ? "" : result.error.message;
};

onMounted(() => {
  clientProfile.fetchProfile();
});
</script>

<template>
  <div class="client-mobile-profile-page">
    <ClientMobilePageTopbar title="Profil" title-id="mobile-profile-title" back-to="back" back-label="Retour" />

  <div class="grid grid-cols-12 gap-8">
    <div class="col-span-12 xl:col-span-7">
      <div class="card">
        <div class="font-semibold text-xl mb-6">Informations personnelles</div>
        <div class="flex items-center gap-4 pb-6 mb-6 border-b border-surface">
          <Avatar :label="initials" size="xlarge" shape="circle" class="!bg-primary !text-primary-contrast" />
          <div><div class="font-semibold text-xl">{{ fullName }}</div><span v-if="accountTypeLabel" class="text-muted-color">{{ accountTypeLabel }}</span></div>
        </div>
        <!-- Cadenas sur tout champ non modifiable de cette page (identité
             civile/téléphone/email réservés au backoffice, voir
             UpdateProfileRequest côté backend) : signale visuellement
             "lecture seule" sans le curseur "interdit" par défaut des
             composants PrimeVue désactivés/readonly (voir
             .profil-readonly-field ci-dessous). -->
        <div class="grid grid-cols-12 gap-4">
          <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
            <label for="first-name" class="font-medium">Prénom</label>
            <IconField class="profil-readonly-field"><InputIcon class="pi pi-lock" /><InputText id="first-name" :model-value="user?.prenom" readonly fluid /></IconField>
          </div>
          <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
            <label for="last-name" class="font-medium">Nom</label>
            <IconField class="profil-readonly-field"><InputIcon class="pi pi-lock" /><InputText id="last-name" :model-value="user?.nom" readonly fluid /></IconField>
          </div>
          <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
            <label for="email" class="font-medium">Adresse e-mail</label>
            <IconField class="profil-readonly-field"><InputIcon class="pi pi-lock" /><InputText id="email" :model-value="user?.email" readonly fluid /></IconField>
          </div>
          <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
            <label for="phone" class="font-medium">Téléphone</label>
            <IconField class="profil-readonly-field"><InputIcon class="pi pi-lock" /><InputText id="phone" :model-value="formattedPhone" readonly fluid /></IconField>
          </div>
        </div>
      </div>
    </div>

    <div class="col-span-12 xl:col-span-5">
      <div class="card">
        <div class="font-semibold text-xl mb-6">Informations professionnelles</div>

        <p v-if="isProfileLoading" class="text-muted-color">Chargement…</p>

        <p v-else-if="profileError" class="text-red-600">{{ profileError.message }}</p>

        <p v-else-if="!profile" class="text-muted-color">Aucune fiche métier associée à ce compte.</p>

        <div v-else class="flex flex-col gap-4">
          <!-- Raison sociale : lecture seule (réservée au backoffice), affichée
               uniquement pour un profil entreprise. Aucun champ "SIRET" :
               n'existe pas dans le modèle ELM. -->
          <div v-if="profile.entreprise" class="flex flex-col gap-2">
            <label for="company" class="font-medium">Société</label>
            <IconField class="profil-readonly-field"><InputIcon class="pi pi-lock" /><InputText id="company" :model-value="profile.entreprise.raison_sociale" readonly fluid /></IconField>
          </div>

          <!-- Localisation : seuls champs réellement modifiables par ce compte
               (PATCH /v1/mobile/profile). -->
          <div class="flex flex-col gap-2"><label for="pays" class="font-medium">Pays</label><InputText id="pays" v-model="localisationForm.pays" fluid /></div>
          <div class="flex flex-col gap-2"><label for="ville" class="font-medium">Ville</label><InputText id="ville" v-model="localisationForm.ville" fluid /></div>
          <div class="flex flex-col gap-2"><label for="adresse" class="font-medium">Adresse</label><InputText id="adresse" v-model="localisationForm.adresse" fluid /></div>
        </div>

        <div v-if="profile" class="flex flex-col items-end gap-2 mt-6">
          <Button label="Mettre à jour" severity="secondary" outlined :loading="isSavingLocalisation" @click="saveLocalisation" />
          <small v-if="localisationSaveMessage" :class="localisationSaveIsError ? 'text-red-600' : 'text-green-600'">{{ localisationSaveMessage }}</small>
        </div>
      </div>

      <div class="card">
        <div class="font-semibold text-xl mb-6">Notifications</div>
        <div class="flex items-center justify-between gap-4">
          <div><span class="font-medium">Alertes d’activité</span><span class="block text-muted-color mt-1">Nouvelles commandes et validations</span></div>
          <ToggleSwitch
            :model-value="profile?.notifications?.activite ?? false"
            :disabled="!profile || isSavingNotifications"
            @update:model-value="onToggleNotifications"
          />
        </div>
        <small v-if="notificationSaveMessage" class="block mt-2" :class="notificationSaveIsError ? 'text-red-600' : ''">{{ notificationSaveMessage }}</small>
      </div>

      <div class="card">
        <div class="font-semibold text-xl mb-6">Sécurité</div>
        <div class="flex items-center justify-between gap-4">
          <div><span class="font-medium">Session</span><span class="block text-muted-color mt-1">Met fin à votre session sur cet appareil uniquement</span></div>
          <Button label="Se déconnecter" severity="danger" outlined :loading="isLoggingOut" @click="handleLogout" />
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<style lang="scss" scoped>
// Champs non modifiables (identité civile/téléphone/email/raison sociale,
// réservés au backoffice — voir script) : cadenas visible plutôt que le
// curseur "interdit" par défaut de PrimeVue sur [readonly], plus agressif que
// ce que justifie une simple absence de fonctionnalité (pas une action
// réellement bloquée).
.profil-readonly-field {
  width: 100%;

  :deep(input) {
    cursor: default !important;
  }

  :deep(.p-inputicon) {
    color: var(--p-text-muted-color);
  }
}
</style>
