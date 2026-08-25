<template>
  <main class="grid lg:grid-cols-2 place-items-center pt-16 pb-8 md:pt-8">
    <div class="p-24 md:order-1 hidden md:block">
      <img
        class="rounded-full transition-transform transform hover:scale-125"
        src="~/assets/img/hero.jpg"
        alt="Starship starts the engine"
        loading="eager"
        format="avif"
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
        <LandingLink class="lg:hidden" href="/connexion">Connexion</LandingLink>
        <LandingLink class="hidden lg:inline-flex" href="/contact">Contactez-nous</LandingLink>
        <LandingLink class="lg:hidden" size="lg" style-name="outline" href="/inscription">Inscription</LandingLink>
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
