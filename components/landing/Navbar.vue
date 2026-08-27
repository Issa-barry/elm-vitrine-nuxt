<script setup>
const menuitems = [
  {
    title: "Produits",
    path: "/produits",
  },
  {
    title: "Prix",
    path: "/pricing",
  },
  {
    title: "A propos de nous",
    path: "/about",
  },
  {
    title: "Contact",
    path: "/contact",
  },
];

const open = ref(false);

// Header public conscient de la session — chantier du 27/08/2026 : réutilise
// EXACTEMENT le mécanisme d'auth déjà en place (composables/useAuth.ts,
// server/api/auth/me.get.ts, cookie httpOnly scellé), jamais un deuxième
// système. La résolution elle-même (ensureFetched(), un seul appel /me par
// session de navigation, jamais un par page) se fait dans middleware/
// session.global.ts, AVANT que ce composant ne soit rendu — pas ici en
// onMounted() : onMounted() est client-only, donc toujours après le premier
// paint SSR, ce qui aurait laissé passer exactement le flash que ce chantier
// doit éliminer. Voir aussi components/landing/Hero.vue, qui affiche ses
// propres CTA Connexion/Inscription sur mobile — même composable partagé
// (useLandingAuthState()), pas deux logiques divergentes.
const authState = useLandingAuthState();
</script>

<template>
  <LandingContainer>
    <header class="flex flex-col lg:flex-row justify-between items-center my-5">
      <div class="flex w-full lg:w-auto items-center justify-between">
        <NuxtLink to="/" aria-label="Accueil Eau La Maman">
          <BrandMark class="w-12 h-12" />
        </NuxtLink>
        <div class="block lg:hidden">
          <button class="text-gray-800" @click="open = !open">
            <svg
              fill="currentColor"
              class="w-4 h-4"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>Menu</title>
              <path
                v-show="open"
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M18.278 16.864a1 1 0 01-1.414 1.414l-4.829-4.828-4.828 4.828a1 1 0 01-1.414-1.414l4.828-4.829-4.828-4.828a1 1 0 011.414-1.414l4.829 4.828 4.828-4.828a1 1 0 111.414 1.414l-4.828 4.829 4.828 4.828z"
              />
              <path
                v-show="!open"
                fill-rule="evenodd"
                d="M4 5h16a1 1 0 010 2H4a1 1 0 110-2zm0 6h16a1 1 0 010 2H4a1 1 0 010-2zm0 6h16a1 1 0 010 2H4a1 1 0 010-2z"
              />
            </svg>
          </button>
        </div>
      </div>
      <nav
        class="w-full lg:w-auto mt-2 lg:flex lg:mt-0"
        :class="{ block: open, hidden: !open }"
      >
        <ul class="flex flex-col lg:flex-row lg:gap-3">
          <li v-for="item of menuitems" :key="item.path">
            <a
              :href="item.path"
              class="flex lg:px-3 py-2 text-gray-600 hover:text-gray-900"
            >
              {{ item.title }}
            </a>
          </li>
        </ul>
        <div class="lg:hidden flex items-center mt-3 gap-4">
          <template v-if="authState === 'loading'">
            <Skeleton width="45%" height="2.5rem" border-radius="6px" />
            <Skeleton width="45%" height="2.5rem" border-radius="6px" />
          </template>
          <LandingLink v-else-if="authState === 'authenticated'" href="/espace-client" size="md" block>
            <span class="inline-flex items-center justify-center gap-2 w-full"><i class="pi pi-user" aria-hidden="true" />Mon espace</span>
          </LandingLink>
          <template v-else>
            <LandingLink href="/connexion" style-name="muted" block size="md"
              >Connexion</LandingLink
            >
            <LandingLink href="/inscription" size="md" block>Inscription</LandingLink>
          </template>
        </div>
      </nav>
      <div>
        <div class="hidden lg:flex items-center gap-4">
          <template v-if="authState === 'loading'">
            <Skeleton width="5.5rem" height="1.5rem" />
            <Skeleton width="7rem" height="2.5rem" border-radius="6px" />
          </template>
          <LandingLink v-else-if="authState === 'authenticated'" href="/espace-client" size="md">
            <span class="inline-flex items-center gap-2"><i class="pi pi-user" aria-hidden="true" />Mon espace</span>
          </LandingLink>
          <template v-else>
            <NuxtLink href="/connexion">Connexion</NuxtLink>
            <LandingLink href="/inscription" size="md">Inscription</LandingLink>
          </template>
        </div>
      </div>
    </header>
  </LandingContainer>
</template>
