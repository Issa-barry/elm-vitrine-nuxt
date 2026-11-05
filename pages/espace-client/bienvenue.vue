<script setup lang="ts">
import { clientDisplayName } from "~/config/auth";
import { compteSansActivite } from "~/config/clientAccueil";

// Accueil neutre d'un compte actif sans activité (compte unique, ADR 0055 côté
// elm-monolithe) : agent du back-office sans fiche rattachée, par exemple.
// L'espace lui est ouvert, mais aucune donnée métier n'est à afficher. Dès
// qu'une activité est rattachée au compte, il retrouve l'accueil habituel.
definePageMeta({
  layout: "client",
  middleware: [
    "auth",
    () => {
      if (!compteSansActivite(useAuth().context.value)) {
        return navigateTo("/espace-client", { replace: true });
      }
    },
  ],
});
useHead({ title: "Bienvenue — Eau La Maman" });

const auth = useAuth();
const router = useRouter();
const displayName = computed(() => clientDisplayName(auth.user.value));
const isLoggingOut = ref(false);

async function seDeconnecter() {
  if (isLoggingOut.value) return;
  isLoggingOut.value = true;
  await auth.logout();
  await router.push("/connexion");
}
</script>

<template>
  <section class="p-4 md:p-0" aria-labelledby="bienvenue-title" data-testid="accueil-sans-activite">
    <div class="card flex flex-col items-center justify-center text-center py-12 px-6" role="status">
      <i class="pi pi-user text-muted-color !text-3xl mb-3" aria-hidden="true" />
      <h1 id="bienvenue-title" class="text-2xl font-semibold mb-2">Bienvenue, {{ displayName }}</h1>
      <p class="text-muted-color mt-0 mb-2 max-w-xl">
        Votre compte EAU LA MAMAN est actif. Aucune activité (propriétaire, livreur, parrain, consultant ou client) n'y
        est rattachée pour le moment : il n'y a pas encore de données à afficher ici.
      </p>
      <p class="text-muted-color mt-0 mb-6 max-w-xl">
        Si vous exercez l'une de ces activités, demandez à un responsable de la rattacher à votre compte.
      </p>
      <div class="flex flex-wrap gap-3 justify-center">
        <NuxtLink to="/">
          <Button label="Découvrir Eau La Maman" icon="pi pi-home" severity="secondary" outlined />
        </NuxtLink>
        <Button
          label="Se déconnecter"
          icon="pi pi-sign-out"
          severity="secondary"
          :loading="isLoggingOut"
          :disabled="isLoggingOut"
          @click="seDeconnecter"
        />
      </div>
    </div>
  </section>
</template>
