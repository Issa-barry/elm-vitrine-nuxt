<script setup lang="ts">
// Mêmes CTA que components/landing/Navbar.vue, affichés ici sur mobile en
// plus du header (accès direct sans ouvrir le menu hamburger) — chantier
// "header auth" du 27/08/2026, même composable partagé, jamais une seconde
// logique de résolution.
const authState = useLandingAuthState();

// Lu ici (en plus de PwaInstallButton, qui lit le même état partagé via
// useState) uniquement pour resituer Connexion/Inscription/Mon espace en
// CTA secondaires quand l'installation devient le CTA principal — demande du
// 29/08/2026 : "Installer l'application" ne doit plus ressembler à une
// option accessoire sous les boutons d'auth. N'appelle jamais initialize()
// ici : PwaInstallButton s'en charge déjà dans son propre onMounted, ce qui
// suffit à faire réagir ce computed (même useState partagé).
const { state: installState } = usePwaInstall();
const installAvailable = computed(() => installState.value !== "hidden");
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
      <!-- CTA principal quand une installation est disponible (demande du
      29/08/2026) : passe AVANT Mon espace/Connexion, qui redescendent alors
      en second rang (outline) — jamais un doublon de gros bouton bleu. Se
      masque automatiquement (v-if INTERNE à PwaInstallButton, pas ici) sans
      laisser de trou : jamais de v-if sur le composant lui-même, sinon son
      onMounted -> initialize() ne tourne jamais et installAvailable
      resterait bloqué à false (composables/usePwaInstall.ts). -->
      <PwaInstallButton variant="primary" />

      <template v-if="authState === 'loading'">
        <Skeleton width="100%" height="2.75rem" border-radius="6px" />
      </template>
      <LandingLink
        v-else-if="authState === 'authenticated'"
        :style-name="installAvailable ? 'outline' : 'primary'"
        href="/espace-client"
      >
        <span class="inline-flex items-center justify-center gap-2 w-full"><i class="pi pi-user" aria-hidden="true" />Mon espace</span>
      </LandingLink>
      <template v-else>
        <LandingLink :style-name="installAvailable ? 'outline' : 'primary'" href="/connexion">Connexion</LandingLink>
        <LandingLink size="lg" :style-name="installAvailable ? 'muted' : 'outline'" href="/inscription">Inscription</LandingLink>
      </template>
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
