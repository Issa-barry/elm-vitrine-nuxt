<script setup lang="ts">
// Mêmes CTA que components/landing/Navbar.vue, affichés ici sur mobile en
// plus du header (accès direct sans ouvrir le menu hamburger) — chantier
// "header auth" du 27/08/2026, même composable partagé, jamais une seconde
// logique de résolution.
const authState = useLandingAuthState();
</script>

<template>
  <main class="grid lg:grid-cols-2 place-items-center pt-16 pb-8 md:pt-8">
    <div class="p-24 md:order-1 hidden md:block">
      <img
        class="rounded-full transition-transform transform hover:scale-125"
        src="~/assets/img/produit/prd-21.webp"
        alt="Bouteille Eau La Maman sur la ligne de production"
        loading="eager"
        width="512"
        height="512"
      >
    </div>

    <div>
      <h1 class="landing-theme-title text-5xl lg:text-6xl xl:text-7xl font-bold lg:tracking-tight">
        Eau La Maman
      </h1>
      <p class="text-lg mt-4 text-slate-600 max-w-xl">
        Gérez simplement vos livraisons, vos véhicules et vos revenus avec Eau
        La Maman.
      </p>
      <div class="mt-6 flex flex-col sm:flex-row gap-3">
        <template v-if="authState === 'loading'">
          <Skeleton class="lg:hidden" width="100%" height="2.75rem" border-radius="6px" />
        </template>
        <LandingLink v-else-if="authState === 'authenticated'" class="lg:hidden" href="/espace-client">
          <span class="inline-flex items-center justify-center gap-2 w-full"><i class="pi pi-user" aria-hidden="true" />Mon espace</span>
        </LandingLink>
        <template v-else>
          <LandingLink class="lg:hidden" href="/connexion">Connexion</LandingLink>
          <LandingLink class="lg:hidden" size="lg" style-name="outline" href="/inscription">Inscription</LandingLink>
        </template>
        <LandingLink class="hidden lg:inline-flex" href="/contact">Contactez-nous</LandingLink>
        <LandingLink
          class="hidden lg:inline-flex"
          size="lg"
          style-name="outline"
          href="/contact"
        >Devenez partenaire</LandingLink>
      </div>
    </div>
  </main>
</template>
