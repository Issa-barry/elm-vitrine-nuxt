<script setup lang="ts">
definePageMeta({ layout: "client", middleware: "auth" });
useHead({ title: "Mon profil — Eau La Maman" });

// Identité (avatar/nom/champs personnels) branchée sur GET /api/auth/me
// (voir docs/api-auth-contract.md côté elm-monolithe) — jamais un second
// appel réseau ici : middleware/auth.ts a déjà peuplé useAuth() via
// ensureFetched() avant que cette page ne s'affiche (sinon redirection vers
// /connexion). Forme exacte de la réponse réelle vérifiée en direct sur un
// compte réel le 26/08/2026 (id, prenom, nom, telephone, email, roles,
// is_active, context) — pas de champ deviné.
//
// Champs sans équivalent dans le contrat backend réel (société, SIRET, ville,
// préférence de notification) : la mise en page existante est conservée telle
// quelle (aucune refonte), mais ces champs restent vides plutôt que de garder
// leur ancienne valeur de démonstration ("Transport IM", "Paris"...) — vide
// est une donnée honnête, une valeur inventée ne l'est pas.
const auth = useAuth();
// Destructurés en bindings top-level : Vue les déballe automatiquement dans
// le template (user.prenom, pas user.value.prenom) — auth.user resterait un
// Ref brut à ce niveau, useAuth() ne renvoyant pas un objet reactive().
const { user, context } = auth;
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

// Aucun endpoint Laravel de mise à jour de profil, de société ou de
// préférence de notification n'existe à ce jour (voir
// docs/api-auth-contract.md côté elm-monolithe) — ces champs restent affichés
// (mise en page conservée) mais vides et non modifiables plutôt que de
// simuler une valeur ou une sauvegarde qui n'existe pas.
const cities = ["Paris", "Boulogne-Billancourt", "Issy-les-Moulineaux", "Neuilly-sur-Seine"];
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
        <!-- Cadenas sur tout champ non modifiable de cette page (aucune
             route Laravel de mise à jour n'existe encore) : signale
             visuellement "lecture seule" sans le curseur "interdit" par
             défaut des composants PrimeVue désactivés/readonly, plus
             agressif que nécessaire ici (voir .profil-readonly-field
             ci-dessous). -->
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
          <!-- Aucune notion de ville dans le modèle ELM (Personne/User) :
               champ conservé (même mise en page), laissé vide plutôt que
               préselectionné sur une valeur inventée. -->
          <div class="col-span-12 flex flex-col gap-2">
            <label for="city" class="font-medium">Ville principale</label>
            <IconField class="profil-readonly-field"><InputIcon class="pi pi-lock" /><Select id="city" :options="cities" placeholder="Non renseigné" disabled fluid /></IconField>
          </div>
        </div>
        <div class="flex justify-end mt-6">
          <Button v-tooltip.top="'Pas encore disponible : aucun endpoint de mise à jour du profil côté backend.'" label="Enregistrer" icon="pi pi-check" disabled />
        </div>
      </div>
    </div>

    <div class="col-span-12 xl:col-span-5">
      <!-- Aucune notion de société/SIRET dans le modèle ELM : champs
           conservés (même mise en page), laissés vides plutôt que de garder
           les anciennes valeurs de démonstration ("Transport IM", ...). -->
      <div class="card">
        <div class="font-semibold text-xl mb-6">Informations professionnelles</div>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="company" class="font-medium">Société</label>
            <IconField class="profil-readonly-field"><InputIcon class="pi pi-lock" /><InputText id="company" placeholder="Non renseigné" readonly fluid /></IconField>
          </div>
          <div class="flex flex-col gap-2">
            <label for="siret" class="font-medium">Numéro SIRET</label>
            <IconField class="profil-readonly-field"><InputIcon class="pi pi-lock" /><InputText id="siret" placeholder="Non renseigné" readonly fluid /></IconField>
          </div>
        </div>
        <div class="flex justify-end mt-6">
          <Button v-tooltip.top="'Pas encore disponible : aucun endpoint de mise à jour du profil côté backend.'" label="Mettre à jour" severity="secondary" outlined disabled />
        </div>
      </div>

      <!-- Aucune notion de préférence de notification dans le modèle ELM :
           carte conservée (même mise en page), interrupteur laissé sur son
           état neutre (désactivé) plutôt que de prétendre "activé" par
           défaut, valeur qui n'existerait nulle part côté backend. -->
      <div class="card">
        <div class="font-semibold text-xl mb-6">Notifications</div>
        <div class="flex items-center justify-between gap-4">
          <div><span class="font-medium">Alertes d’activité</span><span class="block text-muted-color mt-1">Nouvelles commandes et validations</span></div>
          <ToggleSwitch :model-value="false" disabled />
        </div>
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
// Champs non modifiables (aucun endpoint de mise à jour côté backend, voir
// script) : cadenas visible plutôt que le curseur "interdit" par défaut de
// PrimeVue sur [readonly]/[disabled], plus agressif que ce que justifie une
// simple absence de fonctionnalité (pas une action réellement bloquée).
.profil-readonly-field {
  width: 100%;

  :deep(input),
  :deep(.p-select) {
    cursor: default !important;
  }

  :deep(.p-inputicon) {
    color: var(--p-text-muted-color);
  }
}
</style>
