<script setup lang="ts">
// Placeholder UI uniquement (chantier "capacités prestataire" du 27/08/2026)
// — aucune API prestataire n'existe côté elm-monolithe, jamais de faux
// tableau de prestations présenté comme réel (voir demande du 27/08/2026,
// section 8). Middleware "auth" comme le reste de l'espace client (un accès
// direct par URL reste un compte authentifié réel, jamais une preview) —
// masquer l'entrée de menu (capability "services") n'est pas une sécurité,
// voir config/clientCapabilities.ts.
definePageMeta({ layout: "client", middleware: "auth" });
useHead({ title: "Mes prestations — Eau La Maman" });
</script>

<template>
  <div>
  <div class="client-mobile-expenses">
    <ClientMobilePageTopbar title="Prestations" title-id="mobile-services-title" />

    <div class="client-mobile-expenses__empty" role="status">
      <i class="pi pi-briefcase" aria-hidden="true" />
      <strong>Bientôt disponible</strong>
      <span>Le suivi de vos prestations sera disponible prochainement.</span>
    </div>
  </div>

  <section class="client-desktop-expenses" aria-labelledby="desktop-services-title">
    <div class="mb-6">
      <h1 id="desktop-services-title" class="text-3xl font-semibold mb-2">Mes prestations</h1>
    </div>
    <div class="card flex flex-col items-center justify-center text-center py-12" role="status">
      <i class="pi pi-briefcase text-muted-color !text-3xl mb-3" aria-hidden="true" />
      <strong class="text-lg">Bientôt disponible</strong>
      <p class="text-muted-color mt-2 mb-0">Le suivi de vos prestations sera disponible prochainement.</p>
    </div>
  </section>
  </div>
</template>
