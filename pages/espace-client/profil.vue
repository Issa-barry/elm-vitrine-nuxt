<script setup lang="ts">
import { clientDisplayName } from "~/config/auth";
import { buildIdentityPatch, type UpdateClientProfilePayload } from "~/config/clientProfile";
import { webPushStatePresentation } from "~/config/webPush";

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
const { profile, paysDisponibles, isLoading: isProfileLoading, isSavingIdentity, isSavingLocalisation, isSavingNotifications, error: profileError } = clientProfile;

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

const fullName = computed(() => clientDisplayName(user.value));

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

// Prénom/nom/e-mail : le téléphone reste le seul champ verrouillé de cette
// carte. Formulaire initialisé depuis /me, source de l'identité du compte.
const identityForm = reactive({ prenom: "", nom: "", email: "" });
const identityErrors = ref<Record<string, string>>({});
const identityMessage = ref("");
const identityMessageTone = ref<"success" | "warning" | "error">("success");

const resetIdentityForm = () => {
  identityForm.prenom = user.value?.prenom || "";
  identityForm.nom = user.value?.nom || "";
  identityForm.email = user.value?.email || "";
};
watch(user, resetIdentityForm, { immediate: true });

const identityPatch = computed(() => buildIdentityPatch(identityForm, user.value));
const isIdentityDirty = computed(() => Object.keys(identityPatch.value).length > 0);

const saveIdentity = async () => {
  identityMessage.value = "";
  identityErrors.value = {};

  const result = await clientProfile.updateIdentity(identityPatch.value);
  if (!result.ok) {
    identityErrors.value = result.error.fieldErrors || {};
    identityMessageTone.value = "error";
    identityMessage.value = result.error.fieldErrors ? "" : result.error.message;
    return;
  }

  await auth.reloadUser();
  // L'e-mail affiché redevient l'adresse active, même si /me n'a pas changé :
  // la nouvelle adresse n'existe qu'après ouverture du lien.
  resetIdentityForm();

  const confirmation = result.emailConfirmation;
  if (confirmation && !confirmation.envoyee) {
    identityMessageTone.value = "warning";
    identityMessage.value = `Le lien de confirmation n'a pas pu être envoyé à ${confirmation.adresse}. Votre adresse e-mail reste inchangée, réessayez plus tard.`;
  } else if (confirmation) {
    identityMessageTone.value = "success";
    identityMessage.value = `Un lien de confirmation a été envoyé à ${confirmation.adresse}. Votre adresse e-mail changera après l'ouverture de ce lien, valable 24 heures.`;
  } else {
    identityMessageTone.value = "success";
    identityMessage.value = "Informations mises à jour.";
  }
};

const IDENTITY_MESSAGE_CLASSES = { success: "text-green-600", warning: "text-amber-600", error: "text-red-600" };

// Localisation, initialisée dès que /profile répond et à chaque rechargement —
// jamais une valeur de démonstration en repli. Le pays se choisit dans la liste
// du backend ; seul son libellé est enregistré (code_pays reste celui du
// téléphone, voir config/clientProfile.ts).
const localisationForm = reactive<{ pays: string | null; ville: string; adresse: string }>({ pays: null, ville: "", adresse: "" });
watch(
  profile,
  (value) => {
    localisationForm.pays = value?.localisation?.pays || null;
    localisationForm.ville = value?.localisation?.ville || "";
    localisationForm.adresse = value?.localisation?.adresse || "";
  },
  { immediate: true },
);

// Un ancien pays saisi en texte libre reste affiché tel quel, sans être renvoyé
// (le backend le refuserait) tant que l'utilisateur n'en choisit pas un autre.
const paysOptions = computed(() => {
  const actuel = profile.value?.localisation?.pays;
  return actuel && !paysDisponibles.value.includes(actuel) ? [actuel, ...paysDisponibles.value] : paysDisponibles.value;
});

const localisationSaveMessage = ref("");
const localisationSaveIsError = ref(false);

const saveLocalisation = async () => {
  localisationSaveMessage.value = "";
  const paysModifie = localisationForm.pays && localisationForm.pays !== profile.value?.localisation?.pays;
  const result = await clientProfile.updateLocalisation({
    ...(paysModifie ? { pays: localisationForm.pays as UpdateClientProfilePayload["pays"] } : {}),
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

// Web Push (chantier du 28/08/2026, voir composables/useWebPush.ts) —
// DISTINCT de la carte "Notifications" ci-dessus : celle-ci pilote une
// préférence backend/globale au compte (activite), le Web Push est un
// réglage LOCAL à ce navigateur/appareil (section 19-20 du chantier, jamais
// mélangés). `webPush.state`/`isLoading`/`error` sont déstructurés (pas
// `webPush.state.value`) pour bénéficier du même auto-unwrap de refs dans le
// template que `clientProfile`/`auth` plus haut.
const webPush = useWebPush();
const { state: webPushState, isLoading: isWebPushLoading } = webPush;
const webPushPresentation = computed(() => webPushStatePresentation(webPushState.value));

const webPushMessage = ref("");
const webPushMessageIsError = ref(false);

// Déclenché UNIQUEMENT par ce clic explicite (jamais automatiquement) :
// Notification.requestPermission() ne doit jamais être appelé au chargement
// de la page (section 17).
const handleEnableWebPush = async () => {
  webPushMessage.value = "";
  const result = await webPush.subscribe();
  webPushMessageIsError.value = !result.ok;
  webPushMessage.value = result.ok ? "Notifications activées sur cet appareil." : result.error.message;
};

const handleDisableWebPush = async () => {
  webPushMessage.value = "";
  const result = await webPush.unsubscribe();
  webPushMessageIsError.value = !result.ok;
  webPushMessage.value = result.ok ? "" : result.error.message;
};

onMounted(() => {
  clientProfile.fetchProfile();
  // Lecture seule (permission/abonnement déjà existants) + resync
  // silencieuse — ne déclenche jamais Notification.requestPermission().
  webPush.initialize();
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
        <!-- Cadenas sur le seul champ non modifiable de cette carte : signale
             visuellement "lecture seule" sans le curseur "interdit" par défaut
             des composants PrimeVue désactivés/readonly (voir
             .profil-readonly-field ci-dessous). -->
        <form class="grid grid-cols-12 gap-4" @submit.prevent="saveIdentity">
          <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
            <label for="first-name" class="font-medium">Prénom</label>
            <InputText id="first-name" v-model="identityForm.prenom" autocomplete="given-name" :invalid="!!identityErrors.prenom" fluid />
            <small v-if="identityErrors.prenom" class="text-red-600">{{ identityErrors.prenom }}</small>
          </div>
          <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
            <label for="last-name" class="font-medium">Nom</label>
            <InputText id="last-name" v-model="identityForm.nom" autocomplete="family-name" :invalid="!!identityErrors.nom" fluid />
            <small v-if="identityErrors.nom" class="text-red-600">{{ identityErrors.nom }}</small>
          </div>
          <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
            <label for="email" class="font-medium">Adresse e-mail</label>
            <InputText id="email" v-model="identityForm.email" type="email" autocomplete="email" inputmode="email" :invalid="!!identityErrors.email" fluid />
            <small v-if="identityErrors.email" class="text-red-600">{{ identityErrors.email }}</small>
          </div>
          <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
            <label for="phone" class="font-medium">Téléphone</label>
            <IconField class="profil-readonly-field"><InputIcon class="pi pi-lock" /><InputText id="phone" :model-value="formattedPhone" readonly fluid /></IconField>
          </div>
          <div class="col-span-12 flex flex-col items-end gap-2 mt-2">
            <Button type="submit" label="Enregistrer mes informations" severity="secondary" outlined :loading="isSavingIdentity" :disabled="!isIdentityDirty || isSavingIdentity" />
            <small v-if="identityMessage" role="status" class="text-right" :class="IDENTITY_MESSAGE_CLASSES[identityMessageTone]">{{ identityMessage }}</small>
          </div>
        </form>
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

          <div class="flex flex-col gap-2">
            <label id="pays-label" for="pays" class="font-medium">Pays</label>
            <Select v-model="localisationForm.pays" input-id="pays" aria-labelledby="pays-label" :options="paysOptions" placeholder="Sélectionnez un pays" filter filter-placeholder="Rechercher un pays" empty-filter-message="Aucun pays trouvé" empty-message="Liste des pays indisponible pour le moment" fluid />
          </div>
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

      <!-- Réglage LOCAL à ce navigateur/appareil, pas au compte (voir script :
           distinct de la carte "Notifications" ci-dessus, section 19-20). -->
      <div class="card">
        <div class="font-semibold text-xl mb-6">Notifications sur cet appareil</div>
        <div class="flex items-center justify-between gap-4">
          <div>
            <span class="font-medium">{{ webPushPresentation.label }}</span>
            <span class="block text-muted-color mt-1">{{ webPushPresentation.description }}</span>
          </div>
          <Button
            v-if="webPushState === 'not_subscribed'"
            label="Activer"
            size="small"
            :loading="isWebPushLoading"
            @click="handleEnableWebPush"
          />
          <Button
            v-else-if="webPushState === 'subscribed'"
            label="Désactiver"
            severity="secondary"
            outlined
            size="small"
            :loading="isWebPushLoading"
            @click="handleDisableWebPush"
          />
        </div>
        <small v-if="webPushMessage" class="block mt-2" :class="webPushMessageIsError ? 'text-red-600' : 'text-green-600'">{{ webPushMessage }}</small>
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
// Champs non modifiables (téléphone/raison sociale) : cadenas visible plutôt que le
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
