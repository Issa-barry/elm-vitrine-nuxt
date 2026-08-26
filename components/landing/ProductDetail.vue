<script setup lang="ts">
// Reproduction fidèle du bloc "page produit" du template Nuxt Shopify vendored
// dans ce projet (voir _template/shopify/docs/app/components/recipes/ProductPage.vue
// et VariantSelector.vue) et de la démo live
// https://nuxt-shopify.vercel.app/product/hoodie?variantId=46380483608655 —
// texte et données de démonstration Shopify volontairement inchangés, en
// attendant les instructions pour les adapter aux produits Eau La Maman.
import image1500ml from "~/assets/img/produit/prd_6_gris_grand.webp";
import image500ml from "~/assets/img/produit/prd_7_gris_grand.webp";
import image350ml from "~/assets/img/produit/prd_8_gris_grand.webp";

// Titre + prix (GNF, voir la grille tarifaire réelle) pilotés par l'image
// active de la galerie : pas de "Pack" ici, ces photos montrent une bouteille
// seule, pas un pack. packSize/argument reprennent les mêmes infos que
// LandingProductFormats, pour rester cohérent sur toute la page.
const images = [
  {
    src: image1500ml,
    title: "Bouteille de 1,5 L",
    priceGnf: 25000,
    packSize: 6,
    argument: "Le grand format familial, économique pour la maison.",
  },
  {
    src: image500ml,
    title: "Bouteille de 500 ml",
    priceGnf: 20000,
    packSize: 12,
    argument: "Notre format le plus demandé, parfait pour un usage quotidien.",
  },
  {
    src: image350ml,
    title: "Bouteille de 350 ml",
    priceGnf: 20000,
    packSize: 15,
    argument: "Le format individuel, pratique à transporter au quotidien.",
  },
];

const formatGnf = (amount: number) => `${new Intl.NumberFormat("fr-FR").format(amount)} GNF`;

// Sélecteur "Taille" : mêmes données que la galerie (pas de variante séparée),
// juste réordonnées du plus petit au plus grand format pour la lecture.
const formatOptions = [
  { index: 2, label: "350 ml" },
  { index: 1, label: "500 ml" },
  { index: 0, label: "1,5 L" },
];

const activeImageIndex = ref(0);
const activeFormat = computed(() => images[activeImageIndex.value]);
const quantity = ref(1);

function previousImage() {
  activeImageIndex.value = (activeImageIndex.value - 1 + images.length) % images.length;
}

function nextImage() {
  activeImageIndex.value = (activeImageIndex.value + 1) % images.length;
}

function decreaseQuantity() {
  quantity.value = Math.max(1, quantity.value - 1);
}

function increaseQuantity() {
  quantity.value += 1;
}
</script>

<template>
  <div class="grid gap-8 md:grid-cols-2 mt-16">
    <div>
      <div class="relative rounded-md bg-gray-100 aspect-square overflow-hidden">
        <img :src="activeFormat.src" :alt="activeFormat.title" class="w-full h-full object-cover">

        <button
          type="button"
          aria-label="Image précédente"
          class="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-full bg-white shadow"
          @click="previousImage"
        >
          <Icon name="uil:arrow-left" class="w-5 h-5" />
        </button>
        <button
          type="button"
          aria-label="Image suivante"
          class="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-full bg-white shadow"
          @click="nextImage"
        >
          <Icon name="uil:arrow-right" class="w-5 h-5" />
        </button>
      </div>

      <div class="grid grid-cols-2 gap-4 mt-4">
        <button
          v-for="(format, index) of images.slice(1)"
          :key="format.title"
          type="button"
          class="rounded-md bg-gray-100 aspect-square overflow-hidden"
          @click="activeImageIndex = index + 1"
        >
          <img :src="format.src" :alt="format.title" class="w-full h-full object-cover">
        </button>
      </div>
    </div>

    <div class="space-y-8">
      <div>
        <p class="text-4xl font-bold">{{ activeFormat.title }}</p>
        <p class="text-xl mt-2">{{ formatGnf(activeFormat.priceGnf) }}</p>
      </div>

      <hr class="border-gray-200">

      <div>
        <p class="mb-3 text-sm font-semibold text-slate-500">Taille</p>
        <div class="flex flex-wrap gap-3">
          <button
            v-for="option of formatOptions"
            :key="option.label"
            type="button"
            class="h-12 px-5 rounded-md border text-base inline-flex items-center justify-center"
            :class="
              activeImageIndex === option.index
                ? 'border-[var(--p-primary-color,#3b82f6)] text-[var(--p-primary-color,#3b82f6)]'
                : 'border-gray-200 text-slate-600'
            "
            @click="activeImageIndex = option.index"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="flex items-end gap-4">
        <div>
          <p class="mb-3 text-sm font-semibold text-slate-500">Quantité</p>
          <div class="flex items-center border border-gray-200 rounded-md w-36 h-12">
            <button
              type="button"
              aria-label="Diminuer la quantité"
              class="w-11 h-12 flex items-center justify-center text-base text-[var(--p-primary-color,#3b82f6)]"
              @click="decreaseQuantity"
            >
              −
            </button>
            <span class="flex-1 text-center text-base">{{ quantity }}</span>
            <button
              type="button"
              aria-label="Augmenter la quantité"
              class="w-11 h-12 flex items-center justify-center text-base text-[var(--p-primary-color,#3b82f6)]"
              @click="increaseQuantity"
            >
              +
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled
          class="h-12 px-6 rounded-md text-base font-medium flex items-center gap-2 cursor-not-allowed opacity-60 text-[var(--p-primary-color,#3b82f6)] bg-[color-mix(in_srgb,var(--p-primary-color,#3b82f6)_10%,transparent)]"
        >
          <Icon name="uil:shopping-bag" class="w-5 h-5" />
          Ajouter
        </button>
      </div>

      <p class="text-sm text-slate-500">
        Précommande bientôt disponible en ligne.
      </p>

      <p class="text-slate-500">
        {{ activeFormat.argument }} Vendue en pack de {{ activeFormat.packSize }} bouteilles.
      </p>
    </div>
  </div>
</template>
