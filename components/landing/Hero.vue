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
      <div class="mt-6 hidden gap-3 lg:flex">
        <LandingLink href="/contact">Contactez-nous</LandingLink>
        <LandingLink size="lg" style-name="outline" href="/contact">Devenez partenaire</LandingLink>
      </div>
    </div>

    <!-- CTA mobile épinglée en bas de l'écran (hors flux, "position: fixed")
    plutôt qu'à la suite du texte de présentation — demande du 29/08/2026.
    Uniquement < lg : au-delà, les CTA desktop ci-dessus prennent le relais. -->
    <div class="landing-hero-mobile-cta lg:hidden">
      <template v-if="authState === 'loading'">
        <Skeleton width="100%" height="2.75rem" border-radius="6px" />
      </template>
      <LandingLink v-else-if="authState === 'authenticated'" href="/espace-client">
        <span class="inline-flex items-center justify-center gap-2 w-full"><i class="pi pi-user" aria-hidden="true" />Mon espace</span>
      </LandingLink>
      <template v-else>
        <LandingLink href="/connexion">Connexion</LandingLink>
        <LandingLink size="lg" style-name="outline" href="/inscription">Inscription</LandingLink>
      </template>

      <!-- Action secondaire, sous le CTA principal ci-dessus (jamais un
      remplacement de "Mon espace"/"Connexion") — masqué automatiquement si
      déjà installée ou si aucun chemin d'installation n'est disponible, voir
      composables/usePwaInstall.ts. -->
      <PwaInstallButton />
    </div>
  </main>
</template>

<style scoped>
/* Gaté sous le même breakpoint que "lg:hidden" (1024px, Tailwind) : cette
règle n'a pas de media query et primerait sinon sur lg:hidden au cascade
(même spécificité, injectée après les utilitaires Tailwind), gardant la barre
visible sur desktop. */
@media (max-width: 1023.98px) {
  .landing-hero-mobile-cta {
    position: fixed;
    inset-inline: 0;
    bottom: 0;
    z-index: 40;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom));
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    border-top: 1px solid rgb(226 232 240);
  }
}
</style>
