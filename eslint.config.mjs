// Config ESLint autonome (n'a pas besoin que `.nuxt/eslint.config.mjs` ait
// été généré au préalable par le module — plus robuste pour `npm run lint`
// exécuté seul, en CI ou juste après un `npm install`).
import { createConfigForNuxt } from "@nuxt/eslint-config/flat";

export default createConfigForNuxt({
  features: {
    stylistic: false,
  },
})
  .append({
    // Template de référence vendored (sakai-vue), pas du code applicatif.
    ignores: ["_template/**"],
  })
  .append({
    rules: {
      // `@nuxt/eslint-config` 0.6.x active à tort `vue/no-multiple-template-root`
      // (règle historique Vue 2, cf. eslint-plugin-vue/lib/configs/vue2-essential.js)
      // alors que ce projet est en Vue 3 (multi-root <template> supporté nativement,
      // utilisé volontairement dans layouts/landing.vue et plusieurs pages
      // espace-client/*). Désactivé ici plutôt que de restructurer ces templates.
      "vue/no-multiple-template-root": "off",
    },
  });
