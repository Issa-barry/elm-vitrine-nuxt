<script setup>
definePageMeta({
  layout: "landing",
});

const pricing = [
  {
    name: "Pack Bouteille de 350ml",
    price: "20 000 GNF",
    popular: false,
    features: ["Pack de 15 bouteilles"],
    button: {
      text: "Nous contacter",
      link: "/contact",
    },
  },
  {
    name: "Pack Bouteille de 500ml",
    price: "20 000 GNF",
    popular: false,
    features: ["Pack de 12 bouteilles"],
    button: {
      text: "Nous contacter",
      link: "/contact",
    },
  },
  {
    name: "Pack Bouteille de 1500ml",
    price: "25 000 GNF",
    popular: false,
    features: ["Pack de 6 bouteilles"],
    button: {
      text: "Nous contacter",
      link: "/contact",
    },
  },
  {
    name: "Pack de 25 Sachets",
    price: "6 000 GNF",
    popular: false,
    features: ["Pack de 25 sachets"],
    button: {
      text: "Nous contacter",
      link: "/contact",
    },
  },
];
</script>

<template>
  <LandingContainer>
    <LandingSectionhead>
      <template #title>Nos prix</template>
      <template #desc
        >Des prix simples et transparents, sans surprise.</template
      >
    </LandingSectionhead>

    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mx-auto max-w-6xl mt-12">
      <LandingPricing v-for="item of pricing" :key="item.name" :plan="item" />
    </div>
  </LandingContainer>
</template>
