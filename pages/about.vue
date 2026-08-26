<script setup>
definePageMeta({
  layout: "landing",
});

useSeoMeta({
  title: "À propos – Eau La Maman",
  description:
    "Eau La Maman est une entreprise guinéenne spécialisée dans la production, le conditionnement et la distribution d'eau potable, pour les familles, les commerces, les entreprises et les événements.",
  ogTitle: "À propos – Eau La Maman",
  ogDescription:
    "Production, conditionnement et distribution d'eau potable : découvrez Eau La Maman.",
  ogImage: "/logo_grand.png",
});

// Étapes de la chaîne de production, du produit jusqu'au client.
const processSteps = [
  { icon: "pi-cog", title: "Production", desc: "Production de l'eau." },
  { icon: "pi-box", title: "Conditionnement", desc: "Mise en sachets et en bouteilles." },
  { icon: "pi-warehouse", title: "Stockage", desc: "Stockage avant expédition." },
  { icon: "pi-truck", title: "Livraison", desc: "Livraison vers les points de distribution." },
  { icon: "pi-check-circle", title: "Consommation", desc: "Consommation par nos clients." },
];

// Formats vendus, avec le conditionnement par pack.
const formats = [
  { volume: "Sachet", label: "Eau en sachet", pack: "Pack de 25 sachets" },
  { volume: "350 ml", label: "Bouteille 350 ml", pack: "Pack de 15 bouteilles" },
  { volume: "500 ml", label: "Bouteille 500 ml", pack: "Pack de 12 bouteilles" },
  { volume: "1,5 L", label: "Bouteille 1,5 L", pack: "Pack de 6 bouteilles" },
];

// Contextes de consommation.
const dailyContexts = [
  { icon: "mdi:silverware-fork-knife", label: "Restaurants", iconify: true },
  { icon: "pi-trophy", label: "Événements sportifs" },
  { icon: "pi-shop", label: "Commerces" },
  { icon: "pi-briefcase", label: "Entreprises" },
  { icon: "pi-home", label: "Familles" },
];

// Réseau de distribution, de l'usine jusqu'au client.
const distributionSteps = [
  { icon: "pi-building", title: "Usine", desc: "Le point de départ de la production." },
  {
    icon: "pi-warehouse",
    title: "Dépôts / distribution",
    desc: "Des points de distribution répartis pour organiser la livraison.",
  },
  {
    icon: "pi-truck",
    title: "Camions et tricycles",
    desc: "Des camions et des tricycles de livraison, notamment de type Kakata.",
  },
  {
    icon: "pi-shop",
    title: "Revendeurs / clients",
    desc: "Des revendeurs, des commerces et des clients directs.",
  },
];

// Engagements : uniquement des attitudes vérifiables, sans revendication de norme ou de certification.
const commitments = [
  {
    icon: "pi-star",
    title: "Qualité",
    desc: "Une attention portée à la qualité de l'eau et de son conditionnement.",
  },
  {
    icon: "mdi:water",
    title: "Hygiène",
    desc: "Des processus de production et de manipulation pensés pour préserver la propreté du produit.",
    iconify: true,
  },
  {
    icon: "pi-map-marker",
    title: "Proximité",
    desc: "Un réseau de distribution destiné à rapprocher Eau La Maman des consommateurs.",
  },
  {
    icon: "pi-clock",
    title: "Disponibilité",
    desc: "Différents formats adaptés aux besoins du quotidien.",
  },
];
</script>

<template>
  <LandingContainer>
    <!-- 1. Hero -->
    <section class="grid lg:grid-cols-2 gap-12 items-center pt-8 md:pt-12">
      <div>
        <h1
          class="landing-theme-title text-4xl lg:text-5xl font-bold lg:tracking-tight"
        >
          À propos d'Eau La Maman
        </h1>
        <p class="text-lg mt-4 text-slate-600 max-w-lg">
          Nous produisons et distribuons de l'eau destinée aux familles, aux
          commerces, aux entreprises et aux événements.
        </p>
      </div>
      <div class="mx-auto w-full max-w-xs lg:max-w-sm">
        <img
          class="w-full h-auto rounded-3xl shadow-xl"
          src="~/assets/img/produit/prd-19.webp"
          alt="Stock de bouteilles Eau La Maman en entrepôt"
          loading="eager"
          width="1000"
          height="1000"
        >
      </div>
    </section>

    <!-- 2. Qui sommes-nous -->
    <section class="mt-24 max-w-3xl">
      <h2 class="font-bold text-3xl text-gray-800">Qui sommes-nous</h2>
      <p class="text-lg leading-relaxed text-slate-500 mt-4">
        Eau La Maman est une entreprise guinéenne spécialisée dans la
        production, le conditionnement et la distribution d'eau potable.
      </p>
      <p class="text-lg leading-relaxed text-slate-500 mt-3">
        Notre eau accompagne le quotidien : à la maison, dans les commerces,
        dans les entreprises et lors des événements, en sachet comme en
        bouteille.
      </p>
    </section>

    <!-- 3. De la production à la distribution -->
    <section class="mt-24">
      <h2 class="font-bold text-3xl text-gray-800">
        De la production à la distribution
      </h2>
      <p class="text-lg leading-relaxed text-slate-500 mt-3 max-w-2xl">
        Eau La Maman maîtrise chaque étape, de la production jusqu'à la mise
        à disposition du produit.
      </p>

      <div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 mt-10">
        <div
          v-for="(step, index) of processSteps"
          :key="step.title"
          class="border-2 border-[#D8DEE9] border-opacity-50 rounded-md p-5"
        >
          <span class="text-xs font-semibold text-slate-400"
            >{{ String(index + 1).padStart(2, "0") }}</span
          >
          <div
            class="mt-2 bg-blue-600 rounded-full w-9 h-9 flex items-center justify-center shrink-0"
          >
            <i :class="['pi', step.icon, 'text-white']" aria-hidden="true" />
          </div>
          <h3 class="font-semibold text-gray-800 mt-3">{{ step.title }}</h3>
          <p class="text-slate-500 mt-1 text-sm leading-relaxed">
            {{ step.desc }}
          </p>
        </div>
      </div>
    </section>

    <!-- 4. Nos formats -->
    <section class="mt-24">
      <h2 class="font-bold text-3xl text-gray-800">Nos formats</h2>
      <p class="text-lg leading-relaxed text-slate-500 mt-3 max-w-2xl">
        Des formats adaptés à chaque usage, du sachet à la bouteille de 1,5 L.
      </p>

      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
        <div
          v-for="item of formats"
          :key="item.label"
          class="border-2 border-[#D8DEE9] border-opacity-50 rounded-md p-6 text-center"
        >
          <p class="landing-theme-title text-3xl font-bold">
            {{ item.volume }}
          </p>
          <h3 class="mt-2 font-medium text-gray-800">{{ item.label }}</h3>
          <p class="mt-1 text-sm text-slate-500">{{ item.pack }}</p>
        </div>
      </div>
    </section>

    <!-- 5. Une eau pour le quotidien -->
    <section class="mt-24">
      <h2 class="font-bold text-3xl text-gray-800">
        Une eau pour le quotidien
      </h2>
      <p class="text-lg leading-relaxed text-slate-500 mt-3 max-w-2xl">
        Notre eau est présente dans de nombreux contextes de consommation.
      </p>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 mt-10">
        <div
          v-for="item of dailyContexts"
          :key="item.label"
          class="flex flex-col items-center text-center gap-3 py-6 border-2 border-[#D8DEE9] border-opacity-50 rounded-md"
        >
          <div
            class="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center shrink-0"
          >
            <Icon
              v-if="item.iconify"
              :name="item.icon"
              class="text-white w-5 h-5"
              aria-hidden="true"
            />
            <i v-else :class="['pi', item.icon, 'text-white']" aria-hidden="true" />
          </div>
          <span class="text-sm font-medium text-gray-800">{{
            item.label
          }}</span>
        </div>
      </div>
    </section>

    <!-- 6. Notre réseau de distribution -->
    <section class="mt-24">
      <h2 class="font-bold text-3xl text-gray-800">
        Notre réseau de distribution
      </h2>
      <p class="text-lg leading-relaxed text-slate-500 mt-3 max-w-2xl">
        De l'usine jusqu'au client, notre réseau de distribution repose sur
        plusieurs moyens complémentaires.
      </p>

      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
        <div
          v-for="step of distributionSteps"
          :key="step.title"
          class="border-2 border-[#D8DEE9] border-opacity-50 rounded-md p-5"
        >
          <div
            class="bg-blue-600 rounded-full w-9 h-9 flex items-center justify-center shrink-0"
          >
            <i :class="['pi', step.icon, 'text-white']" aria-hidden="true" />
          </div>
          <h3 class="font-semibold text-gray-800 mt-3">{{ step.title }}</h3>
          <p class="text-slate-500 mt-1 text-sm leading-relaxed">
            {{ step.desc }}
          </p>
        </div>
      </div>
    </section>

    <!-- 7. Nos engagements -->
    <section class="mt-24">
      <h2 class="font-bold text-3xl text-gray-800">Nos engagements</h2>

      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
        <div
          v-for="item of commitments"
          :key="item.title"
          class="border-2 border-[#D8DEE9] border-opacity-50 rounded-md p-5"
        >
          <div
            class="bg-blue-600 rounded-full w-9 h-9 flex items-center justify-center shrink-0"
          >
            <Icon
              v-if="item.iconify"
              :name="item.icon"
              class="text-white w-5 h-5"
              aria-hidden="true"
            />
            <i v-else :class="['pi', item.icon, 'text-white']" aria-hidden="true" />
          </div>
          <h3 class="font-semibold text-gray-800 mt-3">{{ item.title }}</h3>
          <p class="text-slate-500 mt-1 text-sm leading-relaxed">
            {{ item.desc }}
          </p>
        </div>
      </div>
    </section>

    <!-- 8. CTA final -->
    <section
      class="bg-blue-600 px-8 py-16 md:px-20 md:py-20 mt-24 mb-20 mx-auto max-w-5xl rounded-lg flex flex-col items-center text-center"
    >
      <h2 class="text-white text-3xl md:text-5xl font-bold lg:tracking-tight">
        Eau La Maman, à vos côtés au quotidien.
      </h2>
      <div class="flex flex-col sm:flex-row gap-3 mt-8">
        <LandingLink href="/pricing" style-name="inverted"
          >Découvrir nos produits</LandingLink
        >
        <NuxtLink
          href="/contact"
          class="rounded text-center transition px-5 py-2.5 border-2 border-white text-white hover:bg-white hover:text-blue-600"
        >
          Nous contacter
        </NuxtLink>
      </div>
    </section>
  </LandingContainer>
</template>
